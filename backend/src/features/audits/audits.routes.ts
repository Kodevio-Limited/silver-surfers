import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { authRequired } from '../auth/auth.middleware.ts';
import { precheckUrl, quickAudit, startAudit } from './audits.controller.ts';
import { subscriptionAccess } from './subscription-access.middleware.ts';

const router = Router();

router.post('/precheck-url', asyncHandler(async (request, response) => {
  await precheckUrl(request, response);
}));

router.post('/start-audit', authRequired, subscriptionAccess, asyncHandler(async (request, response) => {
  await startAudit(request, response);
}));

router.post('/quick-audit', asyncHandler(async (request, response) => {
  await quickAudit(request, response);
}));

export default router;
