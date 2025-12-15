import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/integrations/supabase/server';
import { sendEmail } from '@/lib/email';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  switch (event.type) {
    case 'payment_intent.succeeded':
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
          // Send confirmation email
          await sendEmail(
            userId,
            'auctionWon',
            {
              auctionTitle: auction.title,
              amount: paymentIntent.amount / 100,
              auctionId,
            }
          );
        }
      }
      break;

    case 'payment_intent.payment_failed':
      // Handle failed payment
      console.error('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

