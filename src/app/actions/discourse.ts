'use server';

import { createClient } from '@/integrations/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { revalidatePath } from 'next/cache';

/**
 * Basic safety filter to prevent off-platform transactions.
 */
function validateDiscourseSafety(content: string): { allowed: boolean; reason?: string } {
  // 1. Email Pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(content)) return { allowed: false, reason: 'Contact disclosure (email) restricted.' };

  // 2. Phone Pattern (Rough but effective for many formats)
  const phoneRegex = /(\+?\d{1,4}?[-. ]?\(?\d{1,3}?\)?[-. ]?\d{1,4}[-. ]?\d{1,4}[-. ]?\d{1,9})/;
  if (phoneRegex.test(content) && content.replace(/[^0-9]/g, '').length >= 10) {
    return { allowed: false, reason: 'Contact disclosure (phone) restricted.' };
  }

  // 3. Off-platform & Payment Keywords
  const blacklistedTerms = [
    'whatsapp', 'telegram', 'paypal', 'cashapp', 'venmo', 'zelle',
    'dm me', 'message me', 'contact me', 'outside', 'insta', 'ig handle',
    'twitter', 'discord', 'pay me', 'wire transfer'
  ];
  
  const lowerContent = content.toLowerCase();
  for (const term of blacklistedTerms) {
    if (lowerContent.includes(term)) {
      return { allowed: false, reason: `Safety alert: '${term}' transactions must remain on-platform.` };
    }
  }

  return { allowed: true };
}

/**
 * Saves a community message to the database after passing safety checks.
 */
export async function postChatMessage(content: string, auctionId?: string) {
  try {
    if (!content || !content.trim()) {
      return { error: 'Message content required' };
    }

    // 1. Safety Guard
    const safety = validateDiscourseSafety(content);
    if (!safety.allowed) {
      console.warn(`Safety violation: ${safety.reason}`);
      return { error: safety.reason };
    }

    const supabase = await createClient();
    if (!supabase) {
      return { error: 'Database connection failed.' };
    }

    let user = null;
    
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Auth error during discourse transmission:', error.message);
        return { error: 'Authentication failed. Please sign in.' };
      }
      user = data?.user;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown auth error';
      console.error('Critical auth error:', msg);
      return { error: 'Authentication service unavailable.' };
    }

    if (!user) {
      return { error: 'Unauthorized. Please sign in to participate in the conversation.' };
    }

    // 3. Authorization Check 
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_authorized_seller, seller_status, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'User profile not found.' };
    }

    if (profile.is_authorized_seller === false) {
      console.warn(`Access denied for user ${user.id}`);
      if (profile.seller_status === 'PENDING') {
        return { error: 'Your designer application is pending approval. You will be able to message once authorized.' };
      } else if (profile.role === 'collector') {
        return { error: 'Only authorized designers can post community messages.' };
      } else {
        return { error: 'Your chat privileges have been suspended.' };
      }
    }

    // 4. [Protocol V8.0]: Rate Limit (10 messages per minute)
    const rateLimitResult = rateLimit(`chat:${user.id}`, 10, 60000);
    if (!rateLimitResult.allowed) {
      return { 
        error: 'Rate limit exceeded. Please wait before transmitting again.',
        resetTime: rateLimitResult.resetTime 
      };
    }

    // 5. Data persistence
    const { data, error: dbError } = await supabase
      .from('protocol_discourse')
      .insert({
        content: content.substring(0, 500),
        auction_id: auctionId || null,
        user_id: user.id
      })
      .select('id, content, created_at, user_id')
      .single();

    if (dbError) {
      console.error('DB Error:', dbError);
      return { error: `Failed to save message: ${dbError.message}` };
    }

    revalidatePath('/intel');
    if (auctionId) revalidatePath(`/piece/${auctionId}`);

    return { success: true, data };
  } catch (error) {
    console.error('Critical error:', error);
    return { error: 'A network error occurred.' };
  }
}
