import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

import {
  buildFullAuditPageCacheKey,
  decodeCachedFullAuditPageReport,
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
