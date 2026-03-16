import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAnalysisDetail, buildRemediationRoadmap } from '../src/features/audits/analysis-details.ts';

const sampleScorecard = {
  methodologyVersion: 'silver-score-v1',
  categoryId: 'senior-friendly',
  overallScore: 67.4,
  riskTier: 'high',
  scoreStatus: 'fail',
  pageCount: 4,
  evaluatedAt: '2026-03-16T12:00:00.000Z',
  dimensions: [
    {
      key: 'visualClarity',
      label: 'Visual Clarity',
      score: 58,
      weight: 10,
      issueCount: 2,
      topIssues: [
        {
          auditId: 'color-contrast',
          title: 'Color contrast is too low',
          description: 'Text contrast falls below the recommended threshold.',
          score: 52,
          weight: 9,
          severity: 'high',
          displayValue: '4.1:1',
          sourceUrl: 'https://example.com/home',
        },
      ],
    },
    {
      key: 'motorAccessibility',
      label: 'Motor Accessibility',
      score: 61,
      weight: 8,
      issueCount: 1,
      topIssues: [
        {
          auditId: 'target-size',
          title: 'Tap targets are too small',
          description: 'Interactive controls are difficult to hit accurately.',
          score: 61,
          weight: 6,
          severity: 'high',
          sourceUrl: 'https://example.com/checkout',
        },
      ],
    },
    {
      key: 'contentTrust',
      label: 'Content & Trust',
      score: 74,
      weight: 4,
      issueCount: 1,
      topIssues: [
        {
          auditId: 'total-blocking-time',
          title: 'Main thread is blocked too long',
          description: 'The page remains unresponsive during key interactions.',
          score: 74,
          weight: 3,
          severity: 'medium',
        },
      ],
    },
    {
      key: 'cognitiveLoad',
      label: 'Cognitive Load',
      score: 77,
      weight: 5,
      issueCount: 0,
      topIssues: [],
    },
  ],
  topIssues: [
    {
      auditId: 'color-contrast',
      title: 'Color contrast is too low',
      description: 'Text contrast falls below the recommended threshold.',
      score: 52,
      weight: 9,
      severity: 'high',
      displayValue: '4.1:1',
      sourceUrl: 'https://example.com/home',
    },
    {
      auditId: 'target-size',
      title: 'Tap targets are too small',
      description: 'Interactive controls are difficult to hit accurately.',
      score: 61,
      weight: 6,
      severity: 'high',
      sourceUrl: 'https://example.com/checkout',
    },
  ],
  platforms: [
    {
      key: 'desktop',
      label: 'Desktop',
      score: 69,
      pageCount: 2,
    },
    {
      key: 'mobile',
      label: 'Mobile',
      score: 64,
      pageCount: 2,
    },
  ],
} as const;

test('buildRemediationRoadmap turns stored scorecard issues into prioritized Phase 1 roadmap items', () => {
  const roadmap = buildRemediationRoadmap(sampleScorecard);

  assert.equal(roadmap.length, 3);
  assert.equal(roadmap[0].auditId, 'color-contrast');
  assert.equal(roadmap[0].impact, 'high');
  assert.equal(roadmap[0].effort, 'medium');
  assert.match(roadmap[0].action, /contrast/i);

  assert.equal(roadmap[1].auditId, 'target-size');
  assert.equal(roadmap[1].dimensionKey, 'motorAccessibility');
});

test('buildAnalysisDetail returns normalized scorecard-backed detail payload for account views', () => {
  const detail = buildAnalysisDetail({
    _id: 'rec-1',
    taskId: 'task-123',
    email: 'owner@example.com',
    firstName: 'Ulya',
    lastName: 'Khan',
    url: 'https://example.com',
    planId: 'pro',
    device: 'desktop',
    score: 67.4,
    scoreCard: sampleScorecard,
    status: 'completed',
    emailStatus: 'sent',
    attachmentCount: 3,
    reportDirectory: 'reports-full/example',
    reportFiles: [
      {
        id: 'file-1',
        filename: 'audit-summary.pdf',
        relativePath: 'audit-summary.pdf',
        contentType: 'application/pdf',
      },
    ],
    createdAt: '2026-03-16T12:00:00.000Z',
    updatedAt: '2026-03-16T12:10:00.000Z',
  });

  assert.equal(detail.id, 'rec-1');
  assert.equal(detail.taskId, 'task-123');
  assert.equal(detail.fullName, 'Ulya Khan');
  assert.equal(detail.status, 'completed');
  assert.equal(detail.emailStatus, 'sent');
  assert.equal(detail.riskTier, 'high');
  assert.equal(detail.scoreStatus, 'fail');
  assert.equal(detail.pageCount, 4);
  assert.equal(detail.dimensions.length, 4);
  assert.equal(detail.remediationRoadmap.length, 3);
  assert.equal(detail.reportDirectory, 'reports-full/example');
  assert.equal(detail.reportFiles.length, 1);
  assert.equal(detail.reportFiles[0].displayName, 'audit-summary.pdf');
});
