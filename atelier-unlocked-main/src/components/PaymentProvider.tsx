'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/lib/stripe';

const stripePromise = loadStripe(getStripePublishableKey());

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

