import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createClient } from '@/integrations/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { paymentIntentId, auctionId } = await request.json();

    if (!paymentIntentId || !auctionId) {
      return NextResponse.json(
        { error: 'Missing paymentIntentId or auctionId' },
        { status: 400 }
      );
    }

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

    // Confirm payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Payment successful - auction won
      // This would trigger fulfillment logic
      return NextResponse.json({
        success: true,
        paymentIntent,
      });
    }

    return NextResponse.json({
      success: false,
      status: paymentIntent.status,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to confirm payment';
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

