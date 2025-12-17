import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';

// This endpoint should be called by a cron job (Vercel Cron, Supabase Edge Function, etc.)
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

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
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const checkoutUrl = `${appUrl}/checkout/${auction.id}`;

        // Update auction status and set winner
        await supabase
          .from('auctions')
          .update({ 
            status: 'SOLD',
            winner_id: winningBid.user_id,
            fulfillment_status: 'pending_payment',
          })
          .eq('id', auction.id);

        // Notify winner - get email from auth.users
        if (winningBid.bidder) {
          const { data: { user: winnerUser } } = await supabase.auth.admin.getUserById(winningBid.bidder.id);
          
          if (winnerUser?.email) {
            await sendEmail(
              winnerUser.email,
              'auctionWon',
              {
                auctionTitle: auction.title,
                amount: winningBid.amount,
                auctionId: auction.id,
                checkoutUrl: checkoutUrl,
              }
            ).catch(console.error);
          }
        }

        // Notify designer
        if (auction.designer) {
          const { data: { user: designerUser } } = await supabase.auth.admin.getUserById(auction.designer_id);
          
          if (designerUser?.email) {
            await sendEmail(
              designerUser.email,
              'auctionEnded',
              {
                auctionTitle: auction.title,
                amount: winningBid.amount,
                auctionId: auction.id,
                status: 'sold',
              }
            ).catch(console.error);
          }
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

