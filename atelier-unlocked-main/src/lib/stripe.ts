import Stripe from 'stripe';

let cachedStripe: Stripe | null = null;

/**
 * Lazily create a Stripe client if the secret key is configured.
 * This avoids throwing at import-time (which can break builds in environments
 * where Stripe is not configured yet).
 */
export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;

  if (!cachedStripe) {
    cachedStripe = new Stripe(secret, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }

  return cachedStripe;
}

export const getStripePublishableKey = () =>
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
