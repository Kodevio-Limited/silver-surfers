import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { authRequired } from '../auth/auth.middleware.ts';
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  getPlans,
  getSubscription,
  paymentSuccess,
  subscriptionSuccess,
  upgradeSubscription,
} from './subscription.controller.ts';

const router = Router();

router.get('/subscription', authRequired, asyncHandler(getSubscription));
router.post('/create-checkout-session', authRequired, asyncHandler(createCheckoutSession));
router.post('/create-portal-session', authRequired, asyncHandler(createPortalSession));
router.post('/subscription/upgrade', authRequired, asyncHandler(upgradeSubscription));
router.post('/subscription/cancel', authRequired, asyncHandler(cancelSubscription));
router.get('/subscription/plans', asyncHandler(getPlans));
router.get('/payment-success', authRequired, asyncHandler(paymentSuccess));
router.get('/subscription-success', asyncHandler(subscriptionSuccess));

export default router;
