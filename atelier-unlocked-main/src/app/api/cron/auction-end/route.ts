import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { sendEmail } from '@/lib/email';

// This endpoint should be called by a cron job (Vercel Cron, Supabase Edge Function, etc.)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get expired UNLOCKED auctions
    const { data: unlockedAuctions, error: unlockedError } = await supabase
      .from('auctions')
      .select('*, designer:profiles!auctions_designer_id_fkey(*)')
      .eq('status', 'UNLOCKED')
      .lt('end_time', new Date().toISOString());

    if (unlockedError) throw unlockedError;

    // Mark as SOLD and notify winner
    for (const auction of unlockedAuctions || []) {
      // Get winning bidder
      const { data: winningBid } = await supabase
        .from('bids')
        .select('*, bidder:profiles!bids_user_id_fkey(*)')
        .eq('auction_id', auction.id)
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      if (winningBid) {
        // Update auction status
        await supabase
          .from('auctions')
          .update({ status: 'SOLD' })
          .eq('id', auction.id);

        // Notify winner
        if (winningBid.bidder) {
          await sendEmail(
            winningBid.bidder.id, // Would need email field
            'auctionWon',
            {
              auctionTitle: auction.title,
              amount: winningBid.amount,
              auctionId: auction.id,
            }
          );
        }
      }
    }

    // Get expired LOCKED auctions
    const { data: lockedAuctions, error: lockedError } = await supabase
      .from('auctions')
      .select('*')
      .eq('status', 'LOCKED')
      .lt('end_time', new Date().toISOString());

    if (lockedError) throw lockedError;

    // Mark as VOID
    for (const auction of lockedAuctions || []) {
      await supabase
        .from('auctions')
        .update({ status: 'VOID' })
        .eq('id', auction.id);
    }

    return NextResponse.json({
      success: true,
      processed: {
        sold: unlockedAuctions?.length || 0,
        void: lockedAuctions?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

