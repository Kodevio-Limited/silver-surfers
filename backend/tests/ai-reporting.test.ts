import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAuditAiReportMarkdown, buildFallbackAuditAiReport } from '../src/features/audits/ai-reporting.ts';

const scorecard = {
  overallScore: 68,
  riskTier: 'high',
  scoreStatus: 'fail',
  pageCount: 3,
  dimensions: [
    { label: 'Visual Clarity', score: 59, issueCount: 2 },
    { label: 'Cognitive Load', score: 72, issueCount: 1 },
  ],
  evaluationDimensions: [],
  topIssues: [
    {
      title: 'Color contrast is too low',
      score: 52,
      severity: 'high',
      auditSourceLabel: 'WCAG AA',
      wcagCriteria: ['1.4.3'],
    },
    {
      title: 'Tap targets are too small',
      score: 61,
      severity: 'high',
      auditSourceLabel: 'WCAG AA',
      wcagCriteria: ['2.5.8'],
    },
  ],
} as any;

const remediationRoadmap = [
  {
    title: 'Color contrast is too low',
    bucketKey: 'medium-effort',
    bucketLabel: 'Medium Effort',
    impact: 'high',
    effort: 'medium',
    action: 'Increase text contrast in primary reading areas.',
  },
  {
    title: 'Tap targets are too small',
    bucketKey: 'quick-wins',
    bucketLabel: 'Quick Wins',
    impact: 'high',
    effort: 'low',
    action: 'Increase tap target sizes in the main conversion flow.',
  },
] as any;

test('buildFallbackAuditAiReport creates a business-friendly local narrative', () => {
  const report = buildFallbackAuditAiReport({
    url: 'https://example.com',
    scorecard,
    remediationRoadmap,
  });

  assert.equal(report.status, 'fallback');
  assert.equal(report.provider, 'local');
  assert.match(report.summary, /68%/);
  assert.match(report.businessImpact, /older adults|trust|task completion/i);
  assert.ok(report.topRecommendations.length >= 2);
});

test('buildAuditAiReportMarkdown renders a downloadable executive summary file', () => {
  const report = buildFallbackAuditAiReport({
    url: 'https://example.com',
    scorecard,
    remediationRoadmap,
  });

  const markdown = buildAuditAiReportMarkdown(report, { url: 'https://example.com' });

  assert.match(markdown, /# AI Executive Summary/);
  assert.match(markdown, /## Top Recommendations/);
  assert.match(markdown, /https:\/\/example\.com/);
});
