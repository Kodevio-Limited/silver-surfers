import Stripe from 'stripe';

let stripeClient: Stripe | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('STRIPE_SECRET_KEY is not configured') as Error & { code?: string };
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }

  return stripeClient;
}
