import type { Request, Response } from 'express';

import { logger } from '../../config/logger.ts';
import { getAuditQueues } from './audits.runtime.ts';
import {
  getAnalysisRecordModel,
  getQuickScanModel,
  getSubscriptionModel,
  getUserModel,
  type SubscriptionDocument,
} from './audits.dependencies.ts';
import { buildCandidateUrls, precheckCandidateUrl } from './precheck.service.ts';

const auditsLogger = logger.child('feature:audits');

const VALID_DEVICES = new Set(['desktop', 'mobile', 'tablet']);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

type SubscriptionState = SubscriptionDocument & {
  _id?: string;
  user?: string;
};

function createTaskId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveRequestedCreditType(
  creditType: unknown,
  subscription: SubscriptionState | undefined,
  hasOneTimeScans: boolean,
  selectedDevice?: string,
): boolean {
  if (creditType === 'oneTime') {
    return true;
  }

  if (creditType === 'subscription') {
    return false;
  }

  if (subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status || '')) {
    return false;
  }

  if (hasOneTimeScans && selectedDevice) {
    return true;
  }

  return hasOneTimeScans;
}

async function resolveReachableUrl(rawUrl: string): Promise<{
  input: string;
  normalizedUrl?: string;
  finalUrl?: string;
  status?: number;
  redirected?: boolean;
  error?: string;
}> {
  const { candidateUrls, input } = buildCandidateUrls(rawUrl);
  if (!candidateUrls.length) {
    return { input, error: 'Invalid URL' };
  }

  for (const candidateUrl of candidateUrls) {
    const result = await precheckCandidateUrl(candidateUrl);
    if (result.ok) {
      return {
        input,
        normalizedUrl: candidateUrl,
        finalUrl: result.finalUrl,
        status: result.status,
        redirected: result.redirected,
      };
    }
  }

  return {
    input,
    error: 'URL not reachable. Please check the domain and try again.',
  };
}

export async function precheckUrl(request: Request, response: Response): Promise<void> {
  const rawUrl = String(request.body?.url || '');
  const result = await resolveReachableUrl(rawUrl);

  if (!result.normalizedUrl || !result.finalUrl) {
    response.status(400).json({
      success: false,
      input: result.input,
      error: result.error || 'URL not reachable. Please check the domain and try again.',
    });
    return;
  }

  response.json({
    success: true,
    input: result.input,
    normalizedUrl: result.normalizedUrl,
    finalUrl: result.finalUrl,
    status: result.status,
    redirected: Boolean(result.redirected),
  });
}

export async function startAudit(request: Request, response: Response): Promise<void> {
  const {
    email,
    url,
    selectedDevice,
    firstName,
    lastName,
    creditType,
  } = request.body || {};

  if (!email || !url) {
    response.status(400).json({ error: 'Email and URL are required.' });
    return;
  }

  const userId = request.user?.id;
  if (!userId) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  const subscription = request.subscription as SubscriptionState | undefined;
  const hasOneTimeScans = Boolean(request.hasOneTimeScans);
  const isOneTimeScan = resolveRequestedCreditType(creditType, subscription, hasOneTimeScans, selectedDevice);

  const [User, Subscription, AnalysisRecord] = await Promise.all([
    getUserModel(),
    getSubscriptionModel(),
    getAnalysisRecordModel(),
  ]);

  if (isOneTimeScan) {
    if (!selectedDevice) {
      response.status(400).json({
        error: 'Device selection is required for one-time scans. Please select desktop, mobile, or tablet.',
      });
      return;
    }

    if (!VALID_DEVICES.has(selectedDevice)) {
      response.status(400).json({
        error: `Invalid device selection: ${selectedDevice}. Must be one of: desktop, mobile, tablet`,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user || Number(user.oneTimeScans || 0) <= 0) {
      response.status(403).json({
        error: 'No one-time scans available. Please purchase a scan or subscribe to a plan.',
      });
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $inc: { oneTimeScans: -1 },
    });
  } else {
    if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status || '')) {
      response.status(403).json({
        error: 'No active subscription found. Please subscribe to a plan.',
      });
      return;
    }

    const currentUsage = Number(subscription.usage?.scansThisMonth || 0);
    const scanLimit = subscription.limits?.scansPerMonth;
    if (scanLimit !== undefined && scanLimit !== -1 && currentUsage >= scanLimit) {
      response.status(403).json({
        error: 'Yearly scan limit reached. Please upgrade your plan or wait for the next billing cycle.',
      });
      return;
    }

    if (subscription.planId === 'starter' && !selectedDevice) {
      response.status(400).json({
        error: 'Device selection is required for Starter plan. Please select desktop, mobile, or tablet.',
      });
      return;
    }

    await Subscription.findByIdAndUpdate(subscription._id, {
      $inc: { 'usage.scansThisMonth': 1 },
    });
  }

  const reachableUrl = await resolveReachableUrl(String(url));
  if (!reachableUrl.finalUrl) {
    if (isOneTimeScan) {
      await User.findByIdAndUpdate(userId, { $inc: { oneTimeScans: 1 } }).catch(() => undefined);
    } else if (subscription?._id) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { 'usage.scansThisMonth': -1 },
      }).catch(() => undefined);
    }

    response.status(400).json({ error: reachableUrl.error || 'URL not reachable. Please check the domain and try again.' });
    return;
  }

  const taskId = createTaskId();
  const planId = isOneTimeScan ? 'oneTime' : (subscription?.planId || 'oneTime');

  try {
    const { fullAuditQueue } = getAuditQueues();
    const job = await fullAuditQueue.addJob({
      email,
      url: reachableUrl.finalUrl,
      firstName: firstName || '',
      lastName: lastName || '',
      userId: subscription?.user || userId,
      taskId,
      jobType: 'full-audit',
      subscriptionId: isOneTimeScan ? null : (subscription?._id || null),
      planId,
      selectedDevice,
      priority: 1,
    });

    await AnalysisRecord.create({
      user: subscription?.user || userId,
      email,
      firstName: firstName || '',
      lastName: lastName || '',
      url: reachableUrl.finalUrl,
      taskId,
      planId,
      device: selectedDevice,
      status: 'queued',
      emailStatus: 'pending',
    });

    response.status(202).json({
      message: 'Full audit request has been queued.',
      taskId: job.taskId,
      jobId: job._id,
    });
  } catch (error) {
    auditsLogger.error('Failed to queue full audit.', {
      error: error instanceof Error ? error.message : String(error),
      userId,
      url: reachableUrl.finalUrl,
    });

    if (isOneTimeScan) {
      await User.findByIdAndUpdate(userId, { $inc: { oneTimeScans: 1 } }).catch(() => undefined);
    } else if (subscription?._id) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { 'usage.scansThisMonth': -1 },
      }).catch(() => undefined);
    }

    response.status(500).json({ error: 'Failed to queue audit request' });
  }
}

export async function quickAudit(request: Request, response: Response): Promise<void> {
  const { email, url, firstName, lastName } = request.body || {};
  if (!email || !url) {
    response.status(400).json({ error: 'Email and URL are required.' });
    return;
  }

  const reachableUrl = await resolveReachableUrl(String(url));
  if (!reachableUrl.finalUrl) {
    response.status(400).json({ error: reachableUrl.error || 'URL not reachable. Please check the domain and try again.' });
    return;
  }

  const taskId = createTaskId();

  try {
    const [QuickScan, { quickScanQueue }] = await Promise.all([
      getQuickScanModel(),
      Promise.resolve(getAuditQueues()),
    ]);

    const quickScanRecord = await QuickScan.create({
      url: reachableUrl.finalUrl,
      email: String(email).toLowerCase(),
      firstName: firstName || '',
      lastName: lastName || '',
      status: 'queued',
      scanDate: new Date(),
    });

    const job = await quickScanQueue.addJob({
      email,
      url: reachableUrl.finalUrl,
      firstName: firstName || '',
      lastName: lastName || '',
      userId: null,
      taskId,
      jobType: 'quick-scan',
      subscriptionId: null,
      priority: 2,
      quickScanId: quickScanRecord._id,
    });

    response.status(202).json({
      message: '🆓 FREE Quick audit request has been queued. You will receive results via email shortly!',
      taskId: job.taskId,
      jobId: job._id,
    });
  } catch (error) {
    auditsLogger.error('Failed to queue quick audit.', {
      error: error instanceof Error ? error.message : String(error),
      email,
      url: reachableUrl.finalUrl,
    });

    response.status(500).json({ error: 'Failed to queue audit request' });
  }
}
