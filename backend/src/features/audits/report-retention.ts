import fs from 'node:fs/promises';
import path from 'node:path';

import { logger } from '../../config/logger.ts';
import type { QueueReportStorage } from '../../infrastructure/queues/job-queue.ts';

const retentionLogger = logger.child('feature:audits:report-retention');

function isS3StorageReady(storage: QueueReportStorage | undefined): boolean {
  if (storage?.provider !== 's3') {
    return false;
  }

  if (!storage.bucket || !storage.prefix) {
    return false;
  }

  return Array.isArray(storage.objects) && storage.objects.length > 0;
}

function isS3Uri(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('s3://');
}

export async function cleanupLocalReportDirectoryWhenStored(options: {
  reportDirectory?: string;
  reportStorage?: QueueReportStorage;
  taskId?: string;
  source: 'quick-scan' | 'full-audit';
}): Promise<boolean> {
  if (!isS3StorageReady(options.reportStorage)) {
    return false;
  }

  if (!options.reportDirectory || isS3Uri(options.reportDirectory)) {
    return false;
  }

  const localPath = path.resolve(options.reportDirectory);
  await fs.rm(localPath, { recursive: true, force: true });

  retentionLogger.info('Removed local report directory after S3 persistence.', {
    source: options.source,
    taskId: options.taskId,
    localPath,
    bucket: options.reportStorage?.bucket,
    prefix: options.reportStorage?.prefix,
  });

  return true;
}
