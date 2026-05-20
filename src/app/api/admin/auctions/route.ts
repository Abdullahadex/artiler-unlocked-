import { createClient } from '@supabase/supabase-js/dist/module/index.js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const body = await request.json();
    const { auctionId, action, priorityUntil } = body;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !pubKey || !serviceKey) {
      console.error('Admin API Error: Database URL, Public Key, or Service Key missing');
      return NextResponse.json({ error: 'Server configuration missing. Admin operations require SERVICE_ROLE_KEY.' }, { status: 503 });
    }

    // Step 1: Verify the caller is an admin using a standard client
    const authClient = createClient(url, pubKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Check that caller has admin role
    const { data: callerProfile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // Step 2: Use the Service Role key to bypass security triggers for admin operations
    const adminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (action === 'unlock_auction') {
      const now = new Date();
      // Reset the end_time to a fresh 3-day window from the MOMENT of launch
      const freshEndTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const priorityUntilValue = priorityUntil || new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { error } = await adminClient
        .from('auctions')
        .update({ 
          status: 'LOCKED',
          end_time: freshEndTime,
          priority_until: priorityUntilValue
        })
        .eq('id', auctionId);

      if (error) {
        console.error('Admin unlock error:', error);
        return NextResponse.json({ error: `Failed to unlock auction: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Auction launched to Hub with fresh 3-day window.',
        newEndTime: freshEndTime 
      });
    }

    if (action === 'update_fulfillment') {
      const { status, trackingNumber } = body;
      const updateData: { 
        fulfillment_status: string; 
        tracking_number?: string; 
        shipped_at?: string 
      } = { fulfillment_status: status };
      
      if (trackingNumber !== undefined) {
        updateData.tracking_number = trackingNumber;
        if (status === 'shipped') {
          updateData.shipped_at = new Date().toISOString();
        }
      }

      const { error } = await adminClient
        .from('auctions')
        .update(updateData)
        .eq('id', auctionId);

      if (error) {
        console.error('Admin fulfillment update error:', error);
        return NextResponse.json({ error: `Failed to update fulfillment: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Fulfillment status updated.'
      });
    }

    if (action === 'delete_auction') {
      const { error } = await adminClient
        .from('auctions')
        .delete()
        .eq('id', auctionId);

      if (error) {
        console.error('Admin delete error:', error);
        return NextResponse.json({ error: `Failed to delete auction: ${error.message}` }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Auction permanently removed.'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('Admin API fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
