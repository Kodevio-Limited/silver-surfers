import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFullAuditEmailResult,
  buildFullAuditEmailContent,
  buildSealResultsFilePath,
  finalizeFullAuditRecord,
  resolveDevicesToAudit,
} from '../src/features/audits/full-audit.helpers.ts';

test('resolveDevicesToAudit expands pro plans to all supported devices', () => {
  assert.deepEqual(resolveDevicesToAudit('pro'), ['desktop', 'mobile', 'tablet']);
});

test('resolveDevicesToAudit requires an explicit device for one-time scans', () => {
  assert.throws(
    () => resolveDevicesToAudit('oneTime'),
    /Device selection is required for one-time scans/,
  );
});

test('buildFullAuditEmailContent uses pro messaging without a device filter', () => {
  assert.deepEqual(buildFullAuditEmailContent('pro'), {
    subject: 'Your SilverSurfers Pro Audit Results',
    text: 'Attached are all of the older adult accessibility audit results for your Pro Subscription. Thank you for using SilverSurfers!',
    deviceFilter: null,
  });
});

test('applyFullAuditEmailResult stores S3 metadata and finalizes successful jobs', () => {
  const record = {
    emailStatus: 'sending',
    attachmentCount: 0,
    reportDirectory: '/tmp/reports',
    status: 'processing',
  } as any;

  applyFullAuditEmailResult(record, {
    success: true,
    attachmentCount: 3,
    storage: {
      provider: 's3',
      bucket: 'silver-reports',
      prefix: 'reports/audit-123',
    },
  }, '/tmp/reports');
  finalizeFullAuditRecord(record, { success: true, attachmentCount: 3 });

  assert.equal(record.emailStatus, 'sent');
  assert.equal(record.reportDirectory, 's3://silver-reports/reports/audit-123');
  assert.equal(record.attachmentCount, 3);
  assert.equal(record.status, 'completed');
});

test('finalizeFullAuditRecord marks missing attachments as failed when no uploads succeeded', () => {
  const record = {
    emailStatus: 'sent',
    attachmentCount: 0,
    status: 'processing',
  } as any;

  finalizeFullAuditRecord(record, { success: true, uploadedCount: 0 });

  assert.equal(record.status, 'failed');
  assert.equal(record.failureReason, 'No reports generated (0 files uploaded).');
});

test('buildSealResultsFilePath normalizes the base URL into the legacy reasoning folder', () => {
  const resultsFilePath = buildSealResultsFilePath('team@example.com', 'https://www.example.com/dashboard');

  assert.match(resultsFilePath, /storage[\\\/]seal-reports/);
  assert.match(resultsFilePath, /team@example-com_https___example-com/);
  assert.match(resultsFilePath, /results\.json$/);
});
