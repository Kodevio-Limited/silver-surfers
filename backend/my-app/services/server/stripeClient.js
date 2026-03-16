import Stripe from 'stripe';

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const error = new Error('STRIPE_SECRET_KEY is not configured');
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }

  return stripeClient;
}
