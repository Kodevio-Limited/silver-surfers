import type { JobQueue, QueueOptions, QueueProcessor } from './job-queue.ts';
import { BullMqQueue } from './bullmq-queue.ts';
import { PersistentQueue } from './persistent-queue.ts';

export type QueueBackend = 'persistent' | 'bullmq';

export interface QueueFactoryOptions {
  backend: QueueBackend;
  redisUrl?: string;
  bullMqPrefix?: string;
}

export function createJobQueue(
  queueName: string,
  processJob: QueueProcessor,
  options: QueueOptions,
  factoryOptions: QueueFactoryOptions,
): JobQueue {
  if (factoryOptions.backend === 'bullmq') {
    return new BullMqQueue(queueName, processJob, options, {
      redisUrl: factoryOptions.redisUrl,
      prefix: factoryOptions.bullMqPrefix,
    });
  }

  return new PersistentQueue(queueName, processJob, options);
}
