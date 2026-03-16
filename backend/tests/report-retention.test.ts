import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { cleanupLocalReportDirectoryWhenStored } from '../src/features/audits/report-retention.ts';

test('cleanupLocalReportDirectoryWhenStored removes a local directory after S3 persistence', async () => {
  const reportDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'silver-surfers-report-retention-'));
  await fs.writeFile(path.join(reportDirectory, 'audit-summary.pdf'), 'pdf');

  const removed = await cleanupLocalReportDirectoryWhenStored({
    reportDirectory,
    source: 'full-audit',
    taskId: 'task-123',
    reportStorage: {
      provider: 's3',
      bucket: 'test-bucket',
      region: 'us-east-1',
      prefix: 'reports/task-123',
      objectCount: 1,
      objects: [
        {
          filename: 'audit-summary.pdf',
          key: 'reports/task-123/audit-summary.pdf',
        },
      ],
    },
  });

  assert.equal(removed, true);
  await assert.rejects(fs.access(reportDirectory));
});

test('cleanupLocalReportDirectoryWhenStored keeps local directory when storage is unavailable', async () => {
  const reportDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'silver-surfers-report-retention-'));
  const filePath = path.join(reportDirectory, 'audit-summary.pdf');
  await fs.writeFile(filePath, 'pdf');

  const removed = await cleanupLocalReportDirectoryWhenStored({
    reportDirectory,
    source: 'quick-scan',
    taskId: 'task-456',
    reportStorage: {
      provider: 'unconfigured',
      objectCount: 0,
      objects: [],
    },
  });

  assert.equal(removed, false);
  await fs.access(filePath);
  await fs.rm(reportDirectory, { recursive: true, force: true });
});
