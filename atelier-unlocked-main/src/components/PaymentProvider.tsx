'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { getStripePublishableKey } from '@/lib/stripe';

const stripeKey = getStripePublishableKey();
// Only load Stripe if the publishable key is configured
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  // If Stripe is not configured, just render children without the Elements wrapper
  if (!stripePromise) {
    return <>{children}</>;
  }
  
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
}

