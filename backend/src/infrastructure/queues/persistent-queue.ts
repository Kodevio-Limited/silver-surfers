import { logger } from '../../config/logger.ts';
import { getQueueModel } from './audit-job-model.ts';
import type {
  JobQueue,
  QueueJobDocument,
  QueueJobInput,
  QueueModel,
  QueueOptions,
  QueueProcessor,
  QueueResult,
  QueueStats,
} from './job-queue.ts';

const infrastructureLogger = logger.child('queue');

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

export class PersistentQueue implements JobQueue {
  readonly #queueName: string;
  readonly #jobType: string;
  readonly #processJob: QueueProcessor;
  readonly #options: Required<QueueOptions>;
  readonly #logger;
  readonly #processingJobs = new Set<string>();
  readonly #jobHeartbeats = new Map<string, NodeJS.Timeout>();
  readonly #workerId: string;

  #cleanupTimer: NodeJS.Timeout | undefined;
  #maintenanceTimer: NodeJS.Timeout | undefined;
  #isStarted = false;
  #isShuttingDown = false;

  constructor(queueName: string, processJob: QueueProcessor, options: QueueOptions = {}) {
    this.#queueName = queueName;
    this.#jobType = queueName === 'FullAudit' ? 'full-audit' : 'quick-scan';
    this.#processJob = processJob;
    this.#options = {
      concurrency: options.concurrency ?? 1,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 5000,
      cleanupInterval: options.cleanupInterval ?? 300000,
      jobTimeoutMs: options.jobTimeoutMs ?? (this.#jobType === 'full-audit' ? 180 * 60 * 1000 : 10 * 60 * 1000),
      maintenanceIntervalMs: options.maintenanceIntervalMs ?? 30000,
      leaseDurationMs: options.leaseDurationMs ?? 60000,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 15000,
      recoveryBatchSize: options.recoveryBatchSize ?? 25,
    };
    this.#logger = infrastructureLogger.child(queueName);
    this.#workerId = `${this.#jobType}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async start(): Promise<void> {
    if (this.#isStarted) {
      return;
    }

    this.#isStarted = true;
    this.#isShuttingDown = false;
    this.#cleanupTimer = setInterval(() => {
      void this.performCleanup();
    }, this.#options.cleanupInterval);
    this.#cleanupTimer.unref();

    this.#maintenanceTimer = setInterval(() => {
      void this.performMaintenance();
    }, this.#options.maintenanceIntervalMs);
    this.#maintenanceTimer.unref();

    this.#logger.info('Queue started.', {
      concurrency: this.#options.concurrency,
      workerId: this.#workerId,
      leaseDurationMs: this.#options.leaseDurationMs,
      heartbeatIntervalMs: this.#options.heartbeatIntervalMs,
    });
    void this.processQueue();
  }

  async stop(): Promise<void> {
    this.#isShuttingDown = true;
    this.#isStarted = false;

    if (this.#cleanupTimer) {
      clearInterval(this.#cleanupTimer);
      this.#cleanupTimer = undefined;
    }

    if (this.#maintenanceTimer) {
      clearInterval(this.#maintenanceTimer);
      this.#maintenanceTimer = undefined;
    }

    const startedAt = Date.now();
    while (this.#processingJobs.size > 0 && Date.now() - startedAt < 30000) {
      this.#logger.info('Waiting for in-flight jobs to finish.', {
        processingJobs: this.#processingJobs.size,
      });
      await sleep(1000);
    }

    if (this.#processingJobs.size === 0) {
      return;
    }

    const AuditJob = await getQueueModel();
    for (const jobId of this.#processingJobs) {
      this.stopHeartbeat(jobId);
      const job = await AuditJob.findById(jobId);
      if (!job || job.status !== 'processing') {
        continue;
      }

      await job.fail('Server shutdown', 'Job was processing when the server stopped.', {
        maxAttempts: this.#options.maxRetries,
        baseRetryDelayMs: this.#options.retryDelay,
      });
    }
  }

  async addJob(jobData: QueueJobInput): Promise<QueueJobDocument> {
    const AuditJob = await getQueueModel();
    const taskId = String(jobData.taskId ?? '');
    let job = taskId ? await AuditJob.findOne({ taskId }) : null;

    if (!job) {
      job = new AuditJob({
        ...jobData,
        status: 'queued',
        queuedAt: new Date(),
        maxAttempts: Number(jobData.maxAttempts) > 0 ? Number(jobData.maxAttempts) : this.#options.maxRetries,
        queueBackend: 'persistent',
      });
    } else {
      job.status = 'queued';
      job.completedAt = undefined;
      job.startedAt = undefined;
      job.lastError = undefined;
      job.failureReason = undefined;
      job.retryAfter = undefined;
      job.processingNode = undefined;
      job.workerId = undefined;
      job.queueBackend = 'persistent';
    }

    await job.save();
    this.#logger.info('Job queued.', { taskId: job.taskId, jobType: this.#jobType });
    void this.processQueue();
    return job;
  }

  async recoverJobs(): Promise<void> {
    const AuditJob = await getQueueModel();
    const staleJobs = await AuditJob.getStaleProcessingJobs(this.#jobType, new Date(), this.#options.recoveryBatchSize);

    for (const job of staleJobs) {
      await job.fail(
        'Processing lease expired',
        `Queue lease expired while owned by ${job.workerId || job.processingNode || 'unknown-worker'}.`,
        {
          maxAttempts: job.maxAttempts ?? this.#options.maxRetries,
          baseRetryDelayMs: this.#options.retryDelay,
        },
      );
      this.#logger.warn('Marked stale processing job as failed for retry recovery.', {
        taskId: job.taskId,
        workerId: job.workerId || job.processingNode,
      });
    }

    const failedJobs = await AuditJob.getFailedJobs(this.#jobType, this.#options.recoveryBatchSize);
    for (const job of failedJobs) {
      if (!job.retryAfter || job.retryAfter <= new Date()) {
        await job.resetForRetry();
        this.#logger.warn('Recovered retryable failed job.', { taskId: job.taskId });
      }
    }
  }

  async getStats(): Promise<QueueStats> {
    const AuditJob = await getQueueModel();
    const rows = await AuditJob.aggregate<{ _id: QueueStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return rows.reduce<QueueStats>((stats, row) => {
      stats[row._id] = row.count;
      return stats;
    }, {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    });
  }

  async performCleanup(daysOld = 30): Promise<void> {
    try {
      const AuditJob = await getQueueModel();
      await AuditJob.cleanupOldJobs(daysOld);
    } catch (error) {
      this.#logger.warn('Queue cleanup failed.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async performMaintenance(): Promise<void> {
    if (this.#isShuttingDown || !this.#isStarted) {
      return;
    }

    try {
      await this.recoverJobs();
    } catch (error) {
      this.#logger.warn('Queue maintenance recovery failed.', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!this.#isShuttingDown) {
      void this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.#isShuttingDown || !this.#isStarted) {
      return;
    }

    if (this.#processingJobs.size >= this.#options.concurrency) {
      return;
    }

    const AuditJob = await getQueueModel();
    const job = await AuditJob.getNextJob(this.#jobType, this.#workerId, this.#options.leaseDurationMs);

    if (!job) {
      setTimeout(() => void this.processQueue(), 5000).unref();
      return;
    }

    this.#processingJobs.add(job._id);
    void this.processJob(job);

    if (this.#processingJobs.size < this.#options.concurrency) {
      setTimeout(() => void this.processQueue(), 50).unref();
    }
  }

  private async processJob(job: QueueJobDocument): Promise<void> {
    this.startHeartbeat(job._id);

    try {
      const result = await Promise.race<QueueResult>([
        this.#processJob({
          email: job.email,
          userId: job.userId,
          url: job.url,
          taskId: job.taskId,
          quickScanId: job.quickScanId,
          firstName: job.firstName,
          lastName: job.lastName,
          planId: job.planId,
          selectedDevice: job.selectedDevice,
          jobType: job.jobType,
          subscriptionId: job.subscriptionId,
        }),
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error(`Job timeout after ${this.#options.jobTimeoutMs}ms`)), this.#options.jobTimeoutMs).unref();
        }),
      ]);

      await job.complete(result);
      this.#logger.info('Job completed.', { taskId: job.taskId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await job.fail(message, message, {
        maxAttempts: job.maxAttempts ?? this.#options.maxRetries,
        baseRetryDelayMs: this.#options.retryDelay,
      });
      this.#logger.error('Job failed.', { taskId: job.taskId, error: message, canRetry: job.canRetry() });
    } finally {
      this.stopHeartbeat(job._id);
      this.#processingJobs.delete(job._id);
      if (!this.#isShuttingDown) {
        setTimeout(() => void this.processQueue(), 100).unref();
      }
    }
  }

  private startHeartbeat(jobId: string): void {
    let isRenewing = false;
    const timer = setInterval(() => {
      if (isRenewing || this.#isShuttingDown) {
        return;
      }

      isRenewing = true;
      void this.renewLease(jobId).finally(() => {
        isRenewing = false;
      });
    }, this.#options.heartbeatIntervalMs);
    timer.unref();

    this.#jobHeartbeats.set(jobId, timer);
  }

  private stopHeartbeat(jobId: string): void {
    const timer = this.#jobHeartbeats.get(jobId);
    if (!timer) {
      return;
    }

    clearInterval(timer);
    this.#jobHeartbeats.delete(jobId);
  }

  private async renewLease(jobId: string): Promise<void> {
    try {
      const AuditJob = await getQueueModel();
      const result = await AuditJob.renewLease(jobId, this.#workerId, this.#options.leaseDurationMs);
      const matchedCount = result.matchedCount ?? result.modifiedCount ?? 0;

      if (matchedCount === 0) {
        this.#logger.warn('Queue worker could not renew lease for active job.', {
          jobId,
          workerId: this.#workerId,
        });
      }
    } catch (error) {
      this.#logger.warn('Queue lease heartbeat failed.', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
