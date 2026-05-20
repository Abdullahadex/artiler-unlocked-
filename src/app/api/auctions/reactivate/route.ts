import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export const runtime = 'nodejs';

// This endpoint allows designers to reactivate SOLD items back to the floor
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { auctionId, endTime } = await request.json();

    if (!auctionId) {
      return NextResponse.json(
        { error: 'Missing auctionId' },
        { status: 400 }
      );
    }

    // Get auction
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .single();

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      );
    }

    // Check if user is the designer
    if (auction.designer_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only reactivate your own auctions' },
        { status: 403 }
      );
    }

    // Only allow reactivating SOLD items
    if (auction.status !== 'SOLD') {
      return NextResponse.json(
        { error: 'Can only reactivate SOLD items' },
        { status: 400 }
      );
    }

    // Validate end time if provided
    let newEndTime = endTime;
    if (endTime) {
      const endDate = new Date(endTime);
      const now = new Date();
      
      if (isNaN(endDate.getTime()) || endDate <= now) {
        return NextResponse.json(
          { error: 'End time must be in the future' },
          { status: 400 }
        );
      }

      // Max 3 days from now
      const maxEndTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      if (endDate > maxEndTime) {
        return NextResponse.json(
          { error: 'Auction duration cannot exceed 3 days' },
          { status: 400 }
        );
      }

      newEndTime = endDate.toISOString();
    } else {
      // Default to 3 days from now
      const defaultEndTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      newEndTime = defaultEndTime.toISOString();
    }

    // Reset auction to LOCKED status with new end time
    // Reset bidder count and current price to start price
    const { data: updatedAuction, error: updateError } = await supabase
      .from('auctions')
      .update({
        status: 'LOCKED',
        end_time: newEndTime,
        current_price: auction.start_price,
        unique_bidder_count: 0,
        winner_id: null,
        fulfillment_status: null,
        payment_intent_id: null,
        tracking_number: null,
        shipped_at: null,
      })
      .eq('id', auctionId)
      .select(`
        *,
        designer:profiles!auctions_designer_id_fkey(*)
      `)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      auction: updatedAuction,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reactivate auction error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

