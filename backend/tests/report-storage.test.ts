import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildS3ObjectUrl,
  buildS3Uri,
  buildStoragePrefix,
  isS3Configured,
  sanitizeStorageFileName,
  sanitizeStorageObjectPath,
  sanitizeStoragePathSegment,
} from '../src/features/storage/report-storage.ts';

test('storage helpers sanitize prefixes and build stable S3 URIs', () => {
  const prefix = buildStoragePrefix({
    basePrefix: 'silver_surfers/reports',
    folderPath: '/tmp/reports-full/user@example.com/1773-home_page',
    recipientEmail: 'User.Name+test@example.com',
    kind: 'audit-reports',
    timestamp: new Date('2026-03-16T00:00:00.000Z'),
  });

  assert.equal(sanitizeStoragePathSegment(' User.Name+test@example.com '), 'user-name-test-example-com');
  assert.equal(sanitizeStorageObjectPath('Reports/Quick Scan.pdf'), 'reports/quick-scan-pdf');
  assert.equal(sanitizeStorageFileName('Quick Scan.pdf'), 'quick-scan.pdf');
  assert.equal(sanitizeStorageFileName('AI Executive Summary.PDF'), 'ai-executive-summary.pdf');
  assert.equal(prefix, 'silver-surfers/reports/audit-reports/2026/03/16/user-name-test-at-example-com/1773-home-page');
  assert.equal(buildS3Uri('audit-bucket', prefix), 's3://audit-bucket/silver-surfers/reports/audit-reports/2026/03/16/user-name-test-at-example-com/1773-home-page');
});

test('isS3Configured requires bucket and region', () => {
  assert.equal(isS3Configured({ AWS_S3_BUCKET: 'bucket', AWS_REGION: 'us-east-1' }), true);
  assert.equal(isS3Configured({ AWS_S3_BUCKET: 'bucket' }), false);
  assert.equal(isS3Configured({ AWS_REGION: 'us-east-1' }), false);
});

test('buildS3ObjectUrl returns stable object URLs without signing parameters', () => {
  assert.equal(
    buildS3ObjectUrl({
      bucket: 'moviestore-360',
      region: 'ap-south-1',
      key: 'silver-surfers/quick-scans/2026/03/16/test/report.pdf',
    }),
    'https://moviestore-360.s3.ap-south-1.amazonaws.com/silver-surfers/quick-scans/2026/03/16/test/report.pdf',
  );

  assert.equal(
    buildS3ObjectUrl({
      bucket: 'moviestore-360',
      region: 'ap-south-1',
      key: '/silver-surfers/quick-scans/report.pdf',
      endpoint: 'https://minio.example.com/',
      forcePathStyle: true,
    }),
    'https://minio.example.com/moviestore-360/silver-surfers/quick-scans/report.pdf',
  );
});
