import cron from 'node-cron';
import ScheduledScan from '../../models/scheduled-scan.model.ts';
import { getAuditQueues } from '../../features/audits/audits.runtime.ts';
import { logger } from '../../config/logger.ts';
import type { QueueJobInput } from '../../infrastructure/queues/job-queue.ts';

/**
 * Initialise all scheduled scans from the DB and register cron jobs.
 * This runs at server start‑up (API mode). In worker mode the same file can be
 * imported to start the cron scheduler.
 */
export async function startScheduler(): Promise<void> {
  const scans = await ScheduledScan.find({ status: 'active' }).lean();
  const { fullAuditQueue } = getAuditQueues();

  scans.forEach((scan) => {
    // Validate cron expression – node‑cron will throw if invalid.
    try {
      cron.schedule(scan.cronExpression, async () => {
        logger.info('Running scheduled scan', { user: scan.user, url: scan.url });
        const payload: QueueJobInput = {
          email: 'scheduled@system', // placeholder, could be user email later
          url: scan.url,
          userId: String(scan.user),
          taskId: undefined,
          planId: undefined,
          selectedDevice: undefined,
          firstName: undefined,
          lastName: undefined,
          subscriptionId: undefined,
        };
        await fullAuditQueue.addJob(payload);
        await ScheduledScan.updateOne({ _id: scan._id }, { $set: { lastRunAt: new Date() } });
      });
      logger.info('Scheduled cron job registered', { cron: scan.cronExpression, url: scan.url });
    } catch (err) {
      logger.error('Invalid cron expression for scheduled scan', { scanId: scan._id, error: err });
    }
  });
}
