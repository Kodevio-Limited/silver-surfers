import test from 'node:test';
import assert from 'node:assert/strict';

import { createJobQueue } from '../src/infrastructure/queues/queue-factory.ts';
import { BullMqQueue } from '../src/infrastructure/queues/bullmq-queue.ts';
import { PersistentQueue } from '../src/infrastructure/queues/persistent-queue.ts';

const noopProcessor = async () => ({ emailStatus: 'sent' });

test('createJobQueue returns BullMQ queue when configured', () => {
  const queue = createJobQueue('FullAudit', noopProcessor, {}, {
    backend: 'bullmq',
    redisUrl: 'redis://cache:6379/0',
    bullMqPrefix: 'silver-test',
  });

  assert.ok(queue instanceof BullMqQueue);
});

test('createJobQueue returns persistent queue when BullMQ is not configured', () => {
  const queue = createJobQueue('QuickScan', noopProcessor, {}, {
    backend: 'persistent',
  });

  assert.ok(queue instanceof PersistentQueue);
});
