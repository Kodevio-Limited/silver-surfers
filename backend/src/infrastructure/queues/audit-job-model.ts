import type { QueueModel } from './job-queue.ts';
import AuditJob from '../../models/audit-job.model.ts';

export async function getQueueModel(): Promise<QueueModel> {
  return AuditJob as unknown as QueueModel;
}
