import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export const runtime = 'nodejs';

/**
 * Protocol: Admin Intel Moderation (V8.0)
 * Consolidated path for community curation.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // ROLE_VERIFICATION: Ensure node has curate clearance
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Administrative clearance required' }, { status: 403 });
    }

    const { messageId, action } = await req.json();

    if (action === 'delete_message') {
      if (!messageId) {
        return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
      }

      // PHYSICAL_REMOVAL: Remove the unsuitable signal from the community record
      const { error: deleteError } = await supabase
        .from('protocol_discourse')
        .delete()
        .eq('id', messageId);

      if (deleteError) throw deleteError;

      return NextResponse.json({ 
        success: true, 
        message: '[PROTOCOL_ALERT]: Signal suppressed. Community stream sanitized.' 
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
