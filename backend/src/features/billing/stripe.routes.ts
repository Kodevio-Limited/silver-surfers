import { Router } from 'express';

import { getStripeClient } from './stripe-client.ts';
import {
  handleCheckoutSessionCompleted,
  handlePaymentFailed,
  handlePaymentSucceeded,
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './stripe-webhook.service.ts';

const router = Router();

router.post('/stripe-webhook', async (request, response) => {
  const signature = request.headers['stripe-signature'];
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      response.status(500).send('Webhook secret not configured');
      return;
    }

    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(request.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    response.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break;
    }

    response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    response.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
