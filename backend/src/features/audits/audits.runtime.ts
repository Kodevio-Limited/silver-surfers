import type { JobQueue } from '../../infrastructure/queues/job-queue.ts';

let fullAuditQueue: JobQueue | undefined;
let quickScanQueue: JobQueue | undefined;

export function setAuditQueues(fullQueue: JobQueue, quickQueue: JobQueue): void {
  fullAuditQueue = fullQueue;
  quickScanQueue = quickQueue;
}

export function getAuditQueues(): { fullAuditQueue: JobQueue; quickScanQueue: JobQueue } {
  if (!fullAuditQueue || !quickScanQueue) {
    throw new Error('Audit queues have not been initialized.');
  }

  return {
    fullAuditQueue,
    quickScanQueue,
  };
}
