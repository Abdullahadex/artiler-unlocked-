import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js/dist/module/index.js';
import { rateLimit } from '@/lib/rate-limit';
import type { Database } from '@/integrations/supabase/types';

export const runtime = 'nodejs';

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://') && url.includes('.supabase.co');
}

export async function POST(request: NextRequest) {
  try {
    const { auctionId, refreshToken } = await request.json();

    if (!auctionId) {
      return NextResponse.json({ error: 'Missing auction ID' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    
    if (!isValidSupabaseUrl(url) || !key || key.length < 20) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const response = new NextResponse();
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || null;
    
    let user = null;
    let authError = null;
    let supabase: ReturnType<typeof createServerClient<Database>> | ReturnType<typeof createClient<Database>>;
    
    if (accessToken) {
      supabase = createClient<Database>(url, key);
      if (refreshToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) authError = sessionError;
        else if (session?.user) user = session.user;
      } else {
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(accessToken);
        user = tokenUser;
        authError = tokenError;
      }
    } else {
      supabase = createServerClient<Database>(url, key, {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => { response.cookies.set(name, value, options); }); },
        },
      });
      const authResult = await supabase.auth.getUser();
      user = authResult.data.user;
      authError = authResult.error;
    }

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Protocol Hardening: Anti-Sybil Rate Limit
    // 10 signals maximum per minute from a single user
    const rateLimitResult = rateLimit(`signal:${user.id}`, 10, 60000);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'You are moving a bit too fast. Please wait a moment before showing interest again.' },
        { status: 429 }
      );
    }

    // Attempt to insert signal
    const { error: insertError } = await supabase
      .from('interest_signals')
      .insert({ user_id: user.id, auction_id: auctionId });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Signal already synchronized for this node.' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Sync the signal count to the auctions table securely bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminClient = createClient<Database>(url, serviceRoleKey);
      const { count } = await adminClient
        .from('interest_signals')
        .select('*', { count: 'exact', head: true })
        .eq('auction_id', auctionId);
        
      if (count !== null) {
        await adminClient
          .from('auctions')
          .update({ signals_count: count })
          .eq('id', auctionId);
      }
    }

    const jsonResponse = NextResponse.json({ success: true, auctionId });
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    
    return jsonResponse;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Server error during signal synchronization';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
