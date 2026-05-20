import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * [PROTOCOL_V6.0]: Automated Revalidation Hub
 * Triggered by Supabase Webhooks or pg_cron to ensure accurate "Dark Drop" timing.
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Security Guard: Prevent unauthorized cache busting
    if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // [PROTOCOL_SYNC]: Bust the cache for the marketplace
    revalidatePath('/floor');
    revalidatePath('/intel');
    
    console.log('[PROTOCOL_V6.0_SYNC]: Floor and COMMUNITY cache revalidated successfully.');

    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now(),
      status: 'PROTOCOL_SYNC_COMPLETE'
    });
  } catch (err) {
    console.error('[PROTOCOL_V6.0_SYNC_ERROR]:', err);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
