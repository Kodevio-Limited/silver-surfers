import test from 'node:test';
import assert from 'node:assert/strict';

import { readEnv } from '../src/config/env.ts';

test('readEnv uses scanner URL alias and parses booleans/numbers', () => {
  const parsed = readEnv({
    NODE_ENV: 'production',
    PORT: '9000',
    SCANNER_PORT: '9100',
    PYTHON_SCANNER_URL: 'http://legacy-scanner:8001',
    REQUEST_LOG_ENABLED: 'false',
    PROCESSING_TIMEOUT_MS: '12345',
    REDIS_URL: 'redis://cache:6379/0',
    BULLMQ_PREFIX: 'silver-test',
    SCANNER_MAX_CONCURRENT_AUDITS: '2',
    SCANNER_MAX_QUEUED_AUDITS: '11',
    QUEUE_CLEANUP_INTERVAL_MS: '23456',
    QUEUE_MAINTENANCE_INTERVAL_MS: '34567',
    QUEUE_LEASE_DURATION_MS: '45678',
    QUEUE_HEARTBEAT_INTERVAL_MS: '56789',
    CACHE_CLEANUP_INTERVAL_MS: '67890',
    TEMP_REPORT_TTL_MS: '78901',
    REPORT_DIRECTORY_TTL_MS: '89012',
    QUICK_SCAN_REPORT_TTL_MS: '90123',
  });

  assert.equal(parsed.nodeEnv, 'production');
  assert.equal(parsed.port, 9000);
  assert.equal(parsed.scannerPort, 9100);
  assert.equal(parsed.scannerServiceUrl, 'http://legacy-scanner:8001');
  assert.equal(parsed.requestLogEnabled, false);
  assert.equal(parsed.processingTimeoutMs, 12345);
  assert.equal(parsed.queueBackend, 'bullmq');
  assert.equal(parsed.redisUrl, 'redis://cache:6379/0');
  assert.equal(parsed.bullMqPrefix, 'silver-test');
  assert.equal(parsed.scannerMaxConcurrentAudits, 2);
  assert.equal(parsed.scannerMaxQueuedAudits, 11);
  assert.equal(parsed.queueCleanupIntervalMs, 23456);
  assert.equal(parsed.queueMaintenanceIntervalMs, 34567);
  assert.equal(parsed.queueLeaseDurationMs, 45678);
  assert.equal(parsed.queueHeartbeatIntervalMs, 56789);
  assert.equal(parsed.cacheCleanupIntervalMs, 67890);
  assert.equal(parsed.tempReportTtlMs, 78901);
  assert.equal(parsed.reportDirectoryTtlMs, 89012);
  assert.equal(parsed.quickScanReportTtlMs, 90123);
});

test('readEnv falls back to localhost scanner URL', () => {
  const parsed = readEnv({
    SCANNER_PORT: '8123',
  });

  assert.equal(parsed.scannerServiceUrl, 'http://localhost:8123');
  assert.equal(parsed.queueBackend, 'persistent');
  assert.equal(parsed.scannerMaxConcurrentAudits, 1);
  assert.equal(parsed.scannerMaxQueuedAudits, 8);
  assert.equal(parsed.quickScanReportTtlMs, 30 * 60 * 1000);
});
