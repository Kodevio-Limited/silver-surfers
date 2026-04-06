import test from 'node:test';
import assert from 'node:assert/strict';

import {
  planFullAuditTargetPages,
  resolveFullAuditCompletionStatus,
  selectFullAuditTargetPages,
  shouldPreferLiteScannerForLoad,
} from '../src/features/audits/full-audit.strategy.ts';

test('selectFullAuditTargetPages always keeps homepage first and respects total page limit', () => {
  const pages = selectFullAuditTargetPages(
    'https://example.com/',
    [
      'https://example.com/blog',
      'https://example.com/pricing',
      'https://example.com/contact',
      'https://example.com/about',
      'https://example.com/features',
      'https://example.com/faq',
      'https://example.com/blog/post-1',
    ],
    {
      totalPageLimit: 4,
      priorityPageLimit: 2,
    },
  );

  assert.equal(pages.length, 4);
  assert.equal(pages[0]?.url, 'https://example.com/');
  assert.equal(pages[0]?.isHomepage, true);
});

test('selectFullAuditTargetPages prioritizes pricing and support pages ahead of crawl-order leftovers', () => {
  const pages = selectFullAuditTargetPages(
    'https://example.com/',
    [
      'https://example.com/blog',
      'https://example.com/pricing',
      'https://example.com/team',
      'https://example.com/contact',
      'https://example.com/faq',
      'https://example.com/blog/post-1',
    ],
    {
      totalPageLimit: 5,
      priorityPageLimit: 3,
    },
  );

  assert.deepEqual(
    pages.map((page) => page.url),
    [
      'https://example.com/',
      'https://example.com/pricing',
      'https://example.com/contact',
      'https://example.com/faq',
      'https://example.com/blog',
    ],
  );
});

test('shouldPreferLiteScannerForLoad only sheds non-homepage work when scanner backlog is high', () => {
  const load = {
    activeAudits: 1,
    queuedAudits: 7,
    maxConcurrentAudits: 1,
    maxQueuedAudits: 8,
  };

  assert.equal(shouldPreferLiteScannerForLoad(load, { isHomepage: true }), false);
  assert.equal(shouldPreferLiteScannerForLoad(load, { isHomepage: false }), true);
});

test('planFullAuditTargetPages keeps only the first pages in full mode and sends the rest straight to lite', () => {
  const planned = planFullAuditTargetPages([
    { url: 'https://example.com/', isHomepage: true, priorityBucket: 'homepage' },
    { url: 'https://example.com/pricing', isHomepage: false, priorityBucket: 'primary' },
    { url: 'https://example.com/contact', isHomepage: false, priorityBucket: 'secondary' },
    { url: 'https://example.com/blog', isHomepage: false, priorityBucket: 'other' },
  ], {
    fullModePageLimit: 2,
  });

  assert.deepEqual(
    planned.map((page) => ({ url: page.url, preferredScanMode: page.preferredScanMode, allowFullRetry: page.allowFullRetry })),
    [
      { url: 'https://example.com/', preferredScanMode: 'full', allowFullRetry: true },
      { url: 'https://example.com/pricing', preferredScanMode: 'full', allowFullRetry: false },
      { url: 'https://example.com/contact', preferredScanMode: 'lite', allowFullRetry: false },
      { url: 'https://example.com/blog', preferredScanMode: 'lite', allowFullRetry: false },
    ],
  );
});

test('resolveFullAuditCompletionStatus distinguishes clean, degraded, and failed outcomes', () => {
  assert.equal(resolveFullAuditCompletionStatus({
    plannedTargetCount: 6,
    successfulTargetCount: 6,
    degradedTargetCount: 0,
    failedTargetCount: 0,
    warnings: [],
  }), 'completed');

  assert.equal(resolveFullAuditCompletionStatus({
    plannedTargetCount: 6,
    successfulTargetCount: 4,
    degradedTargetCount: 2,
    failedTargetCount: 0,
    warnings: ['Lite fallback used.'],
  }), 'completed_with_warnings');

  assert.equal(resolveFullAuditCompletionStatus({
    plannedTargetCount: 6,
    successfulTargetCount: 0,
    degradedTargetCount: 0,
    failedTargetCount: 6,
    warnings: ['No usable results produced.'],
  }), 'failed');
});
