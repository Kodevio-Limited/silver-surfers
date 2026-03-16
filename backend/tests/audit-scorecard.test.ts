import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAggregateAuditScorecard, buildAuditScorecard } from '../src/features/audits/audit-scorecard.ts';

const FULL_AUDIT_IDS = [
  'color-contrast',
  'target-size',
  'viewport',
  'cumulative-layout-shift',
  'text-font-audit',
  'layout-brittle-audit',
  'flesch-kincaid-audit',
  'largest-contentful-paint',
  'total-blocking-time',
  'link-name',
  'button-name',
  'label',
  'interactive-color-audit',
  'is-on-https',
  'dom-size',
  'heading-order',
  'errors-in-console',
  'geolocation-on-start',
];

function buildReport(scoreOverrides: Record<string, number> = {}) {
  const audits = Object.fromEntries(FULL_AUDIT_IDS.map((auditId) => ([
    auditId,
    {
      title: auditId,
      description: `${auditId} description`,
      score: scoreOverrides[auditId] ?? 1,
      displayValue: `${auditId} display`,
    },
  ])));

  return { audits };
}

test('buildAuditScorecard returns a passing low-risk scorecard when all audits pass', () => {
  const scorecard = buildAuditScorecard(buildReport(), { pageUrl: 'https://example.com' });

  assert.equal(scorecard.overallScore, 100);
  assert.equal(scorecard.scoreStatus, 'pass');
  assert.equal(scorecard.riskTier, 'low');
  assert.equal(scorecard.pageCount, 1);
  assert.equal(scorecard.dimensions.length, 4);
  assert.equal(scorecard.topIssues.length, 0);

  for (const dimension of scorecard.dimensions) {
    assert.equal(dimension.score, 100);
    assert.equal(dimension.issueCount, 0);
  }
});

test('buildAuditScorecard groups low-scoring findings into the right primary dimension', () => {
  const scorecard = buildAuditScorecard(buildReport({
    'color-contrast': 0,
    'text-font-audit': 0,
  }), { pageUrl: 'https://example.com/page-a' });

  assert.ok(scorecard.overallScore < 80);
  assert.equal(scorecard.scoreStatus, 'needs-improvement');
  assert.equal(scorecard.riskTier, 'medium');

  const visualClarity = scorecard.dimensions.find((dimension) => dimension.key === 'visualClarity');
  assert.ok(visualClarity);
  assert.ok(visualClarity.score < 70);
  assert.equal(visualClarity.issueCount, 2);
  assert.equal(visualClarity.topIssues[0].auditId, 'text-font-audit');
  assert.equal(visualClarity.topIssues[0].sourceUrl, 'https://example.com/page-a');
});

test('buildAggregateAuditScorecard averages page scorecards and keeps worst issues', () => {
  const pageA = buildAuditScorecard(buildReport({
    'color-contrast': 0,
    'text-font-audit': 0,
  }), { pageUrl: 'https://example.com/page-a' });
  const pageB = buildAuditScorecard(buildReport({
    'label': 0,
  }), { pageUrl: 'https://example.com/page-b' });

  const aggregate = buildAggregateAuditScorecard([pageA, pageB], {
    platforms: [
      { key: 'desktop', label: 'Desktop', score: 76, pageCount: 2 },
    ],
  });

  assert.equal(aggregate.pageCount, 2);
  assert.equal(aggregate.platforms.length, 1);
  assert.ok(aggregate.overallScore < 90);
  assert.ok(aggregate.topIssues.length > 0);
  assert.equal(aggregate.topIssues[0].auditId, 'text-font-audit');

  const motorAccessibility = aggregate.dimensions.find((dimension) => dimension.key === 'motorAccessibility');
  assert.ok(motorAccessibility);
  assert.ok(motorAccessibility.issueCount >= 1);
});
