import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  buildFullAuditPageCacheKey,
  buildFullAuditReuseCacheKey,
  decodeCachedCompletedFullAuditSnapshot,
  decodeCachedFullAuditPageReport,
  encodeCachedCompletedFullAuditSnapshot,
  encodeCachedFullAuditPageReport,
  materializeCachedFullAuditPageReport,
  normalizePageCacheUrl,
  normalizeWebsiteCacheUrl,
} from '../src/features/audits/audit-cache.ts';

test('normalizeWebsiteCacheUrl collapses www hostnames and ignores page path', () => {
  assert.equal(normalizeWebsiteCacheUrl('https://www.Example.com/about?ref=1'), 'example.com');
});

test('normalizePageCacheUrl removes www, query string, hash, and trailing slash', () => {
  assert.equal(normalizePageCacheUrl('https://www.Example.com/about/?ref=1#section'), 'https://example.com/about');
});

test('buildFullAuditPageCacheKey is stable for equivalent website and page URLs', () => {
  const first = buildFullAuditPageCacheKey('https://www.example.com/', 'https://www.example.com/about/?ref=1', 'desktop');
  const second = buildFullAuditPageCacheKey('https://example.com', 'https://example.com/about', 'desktop');

  assert.equal(first, second);
});

test('encodeCachedFullAuditPageReport and decodeCachedFullAuditPageReport preserve report payloads', () => {
  const encoded = encodeCachedFullAuditPageReport({
    websiteUrl: 'https://www.example.com/',
    pageUrl: 'https://www.example.com/about?x=1',
    device: 'mobile',
    isLiteVersion: true,
    report: {
      categories: {
        'senior-friendly-lite': {
          score: 0.81,
        },
      },
      finalUrl: 'https://www.example.com/about',
    },
  });

  const decoded = decodeCachedFullAuditPageReport(encoded);

  assert.deepEqual(decoded, {
    websiteUrl: 'example.com',
    pageUrl: 'https://example.com/about',
    device: 'mobile',
    isLiteVersion: true,
    cachedAt: decoded?.cachedAt,
    report: {
      categories: {
        'senior-friendly-lite': {
          score: 0.81,
        },
      },
      finalUrl: 'https://www.example.com/about',
    },
  });
  assert.ok(decoded?.cachedAt);
});

test('materializeCachedFullAuditPageReport writes a temporary JSON report file', async (t) => {
  const reportPath = await materializeCachedFullAuditPageReport({
    websiteUrl: 'example.com',
    pageUrl: 'https://example.com/contact',
    device: 'tablet',
    isLiteVersion: false,
    cachedAt: new Date().toISOString(),
    report: {
      requestedUrl: 'https://example.com/contact',
      audits: {},
    },
  });

  t.after(async () => {
    await fs.rm(reportPath, { force: true }).catch(() => undefined);
  });

  const stored = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  assert.equal(stored.requestedUrl, 'https://example.com/contact');
  assert.match(reportPath, /report-example-com-\d+\.json$/);
});

test('buildFullAuditReuseCacheKey is stable for equivalent website scopes', () => {
  const first = buildFullAuditReuseCacheKey({
    websiteUrl: 'https://www.example.com/',
    planId: 'pro',
    selectedDevice: null,
    totalPageLimit: 25,
    priorityPageLimit: 3,
    fullModePageLimit: 1,
  });
  const second = buildFullAuditReuseCacheKey({
    websiteUrl: 'https://example.com/about',
    planId: 'pro',
    selectedDevice: null,
    totalPageLimit: 25,
    priorityPageLimit: 3,
    fullModePageLimit: 1,
  });

  assert.equal(first, second);
});

test('encodeCachedCompletedFullAuditSnapshot and decodeCachedCompletedFullAuditSnapshot preserve reusable audit metadata', () => {
  const encoded = encodeCachedCompletedFullAuditSnapshot({
    websiteUrl: 'https://example.com/',
    planId: 'pro',
    selectedDevice: null,
    totalPageLimit: 25,
    priorityPageLimit: 3,
    fullModePageLimit: 1,
    status: 'completed_with_warnings',
    cachedAt: '2026-04-06T08:00:00.000Z',
    sourceTaskId: 'task-123',
    score: 81,
    warnings: ['Reused from cache.'],
    plannedTargetCount: 75,
    successfulTargetCount: 75,
    degradedTargetCount: 12,
    failedTargetCount: 0,
    scanTargets: [{ url: 'https://example.com/', device: 'desktop', status: 'completed' }],
    attachmentCount: 4,
    reportDirectory: 's3://bucket/reports/task-123',
    reportStorage: {
      provider: 's3',
      bucket: 'bucket',
      prefix: 'reports/task-123',
      objectCount: 4,
      objects: [],
    },
    reportFiles: [
      {
        id: 'file-1',
        filename: 'audit-summary.pdf',
        storageKey: 'reports/task-123/audit-summary.pdf',
        contentType: 'application/pdf',
      },
    ],
  });

  const decoded = decodeCachedCompletedFullAuditSnapshot(encoded);

  assert.equal(decoded?.websiteUrl, 'https://example.com/');
  assert.equal(decoded?.status, 'completed_with_warnings');
  assert.equal(decoded?.sourceTaskId, 'task-123');
  assert.equal(decoded?.reportFiles[0]?.filename, 'audit-summary.pdf');
});
