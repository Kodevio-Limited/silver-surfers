import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import AuditJob from '../src/models/audit-job.model.ts';

test('AuditJob.fail clears processing lease state and schedules a retry when attempts remain', async (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  const job = new AuditJob({
    email: 'queue@example.com',
    url: 'https://example.com',
    taskId: 'task-retryable',
    jobType: 'quick-scan',
    status: 'processing',
    maxAttempts: 3,
    retryCount: 0,
    processingNode: 'node-a',
    workerId: 'worker-a',
    leaseHeartbeatAt: new Date(),
    processingLeaseExpiresAt: new Date(),
    browserLockAcquired: true,
  }) as any;

  mock.method(job, 'save', async function (this: any) {
    return this;
  });

  await job.fail('boom', 'boom', { maxAttempts: 3, baseRetryDelayMs: 5000 });

  assert.equal(job.status, 'failed');
  assert.equal(job.retryCount, 1);
  assert.equal(job.processingNode, undefined);
  assert.equal(job.workerId, undefined);
  assert.equal(job.leaseHeartbeatAt, undefined);
  assert.equal(job.processingLeaseExpiresAt, undefined);
  assert.equal(job.browserLockAcquired, false);
  assert.ok(job.retryAfter instanceof Date);
});

test('AuditJob.fail does not schedule retryAfter once max retry count is reached', async (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  const job = new AuditJob({
    email: 'queue@example.com',
    url: 'https://example.com',
    taskId: 'task-exhausted',
    jobType: 'quick-scan',
    status: 'processing',
    maxAttempts: 3,
    retryCount: 2,
    processingNode: 'node-b',
    workerId: 'worker-b',
  }) as any;

  mock.method(job, 'save', async function () {
    return this;
  });

  await job.fail('boom', 'boom', { maxAttempts: 3, baseRetryDelayMs: 5000 });

  assert.equal(job.retryCount, 3);
  assert.equal(job.retryAfter, undefined);
  assert.equal(job.canRetry(), false);
});
