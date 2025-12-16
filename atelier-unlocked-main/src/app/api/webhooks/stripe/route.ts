import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/integrations/supabase/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      const { auctionId, userId } = paymentIntent.metadata;

      if (auctionId && userId) {
        // Payment successful - handle auction win
        const { data: auction } = await supabase
          .from('auctions')
          .select('*')
          .eq('id', auctionId)
          .single();

        if (auction) {
          // Optional: notify the winner. We need a reliable user email source for this flow
          // (e.g., store email in a profile record or include it in payment metadata).
          console.log('Payment succeeded; skipping email notification (recipient email not available).');
        }
      }
      break;
    }

    case 'payment_intent.payment_failed':
      // Handle failed payment
      console.error('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

