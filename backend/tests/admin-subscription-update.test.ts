import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import Subscription from '../src/models/subscription.model.ts';
import User from '../src/models/user.model.ts';
import { getStripeClient } from '../src/features/billing/stripe-client.ts';

function createMockResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.payload = payload;
      return this;
    }
  };
}

test('updateUserSubscription replaces a Stripe subscription that is already canceled', async (t) => {
  const originalSecretKey = process.env.STRIPE_SECRET_KEY;
  const originalProPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;

  t.after(() => {
    mock.restoreAll();

    if (originalSecretKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalSecretKey;
    }

    if (originalProPriceId === undefined) {
      delete process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    } else {
      process.env.STRIPE_PRO_YEARLY_PRICE_ID = originalProPriceId;
    }
  });

  process.env.STRIPE_SECRET_KEY = 'sk_test_admin_subscription_update';
  process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_pro_yearly_test';

  const { updateUserSubscription } = await import('../src/features/admin/admin.controller.ts');

  const currentSubscription = {
    _id: 'local-subscription-id',
    stripeSubscriptionId: 'sub_old_canceled',
    currentPeriodStart: new Date('2026-01-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2027-01-01T00:00:00.000Z')
  };

  const user = {
    _id: 'user-123',
    email: 'customer@example.com',
    stripeCustomerId: 'cus_existing_customer'
  };

  const subscriptionUpdates: Array<{ id: string; update: Record<string, unknown> }> = [];
  const userUpdates: Array<{ id: string; update: Record<string, unknown> }> = [];

  mock.method(User, 'findById', async (id: string) => {
    assert.equal(id, 'user-123');
    return user;
  });

  mock.method(User, 'findByIdAndUpdate', async (id: string, update: Record<string, unknown>) => {
    userUpdates.push({ id, update });
    return null;
  });

  mock.method(Subscription, 'findOne', async () => currentSubscription);
  mock.method(Subscription, 'findByIdAndUpdate', async (id: string, update: Record<string, unknown>) => {
    subscriptionUpdates.push({ id, update });
    return null;
  });
  mock.method(Subscription.prototype, 'save', async function () {
    return this;
  });

  const stripe = getStripeClient();
  let updateCalled = false;
  let createPayload: Record<string, unknown> | null = null;

  mock.method(stripe.subscriptions, 'retrieve', async (id: string) => {
    assert.equal(id, 'sub_old_canceled');

    return {
      id,
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: 1767225600,
      current_period_start: 1735689600,
      current_period_end: 1767225600
    };
  });

  mock.method(stripe.subscriptions, 'update', async () => {
    updateCalled = true;
    throw new Error('subscriptions.update should not be called for canceled subscriptions');
  });

  mock.method(stripe.subscriptions, 'create', async (payload: Record<string, unknown>) => {
    createPayload = payload;

    return {
      id: 'sub_new_replacement',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: 1767312000,
      current_period_end: 1798848000
    };
  });

  const req = {
    user: { role: 'admin' },
    body: { userId: 'user-123', planId: 'pro' }
  };
  const res = createMockResponse();

  await updateUserSubscription(req as never, res as never);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, {
    message: 'New subscription created successfully',
    subscription: res.payload?.subscription,
    created: true
  });

  assert.equal(updateCalled, false);
  assert.equal(createPayload?.customer, 'cus_existing_customer');
  assert.deepEqual(createPayload?.items, [{ price: 'price_pro_yearly_test' }]);

  assert.equal(subscriptionUpdates.length, 1);
  assert.equal(subscriptionUpdates[0]?.id, 'local-subscription-id');
  assert.equal(subscriptionUpdates[0]?.update.status, 'canceled');

  assert.equal(userUpdates.length, 2);
  assert.equal(userUpdates[0]?.update['subscription.status'], 'canceled');
  assert.equal(userUpdates[1]?.update['subscription.stripeSubscriptionId'], 'sub_new_replacement');
  assert.equal(userUpdates[1]?.update['subscription.status'], 'active');
  assert.equal(userUpdates[1]?.update['subscription.planId'], 'pro');
  assert.equal(userUpdates[1]?.update['subscription.priceId'], 'price_pro_yearly_test');
});
