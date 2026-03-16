import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.ts';
import { getSubscriptionModel, getUserModel } from './audits.dependencies.ts';

const accessLogger = logger.child('feature:audits:access');

export async function subscriptionAccess(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const userId = request.user?.id;
    if (!userId) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    const [Subscription, User] = await Promise.all([
      getSubscriptionModel(),
      getUserModel(),
    ]);

    const [subscription, user] = await Promise.all([
      Subscription.findOne({
        user: userId,
        status: { $in: ['active', 'trialing'] },
      }).lean(),
      User.findById(userId).lean(),
    ]);

    const hasOneTimeScans = Number(user?.oneTimeScans || 0) > 0;
    if (!subscription && !hasOneTimeScans) {
      response.status(403).json({
        error: 'No active subscription or one-time scans available. Please subscribe or purchase a scan.',
      });
      return;
    }

    request.subscription = subscription;
    request.hasOneTimeScans = hasOneTimeScans;
    next();
  } catch (error) {
    accessLogger.error('Subscription access check failed.', {
      error: error instanceof Error ? error.message : String(error),
    });
    response.status(500).json({ error: 'Failed to check subscription access' });
  }
}
