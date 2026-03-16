import type { QueueReportStorage } from '../../infrastructure/queues/job-queue.ts';
import type {
  AuditDimensionKey,
  AuditDimensionScore,
  AuditIssueSummary,
  AuditPlatformScore,
  AuditRiskTier,
  AuditScorecard,
  AuditScoreStatus,
} from './audit-scorecard.ts';
import { buildAnalysisReportFileViews, normalizeStoredReportFiles, type AnalysisReportFileView, type StoredReportFile } from './report-files.ts';

export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type AnalysisEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';
export type RemediationImpact = 'high' | 'medium' | 'low';
export type RemediationEffort = 'low' | 'medium' | 'high';

export interface AnalysisRecordLike {
  _id?: string;
  taskId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  url?: string;
  planId?: string | null;
  device?: string | null;
  score?: number | null;
  scoreCard?: AuditScorecard;
  status?: string;
  emailStatus?: string;
  attachmentCount?: number;
  failureReason?: string;
  emailError?: string;
  reportDirectory?: string;
  reportStorage?: QueueReportStorage;
  reportFiles?: Array<StoredReportFile | Record<string, unknown>>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AnalysisRemediationItem {
  id: string;
  auditId: string;
  title: string;
  dimensionKey: AuditDimensionKey;
  dimensionLabel: string;
  severity: AuditRiskTier;
  currentScore: number;
  impact: RemediationImpact;
  effort: RemediationEffort;
  action: string;
  whyItMatters: string;
  displayValue?: string;
  sourceUrl?: string;
}

export interface AnalysisDetailView {
  id?: string;
  taskId: string;
  url: string;
  email?: string;
  fullName?: string;
  planId?: string | null;
  device?: string | null;
  status: AnalysisStatus;
  emailStatus: AnalysisEmailStatus;
  score?: number | null;
  riskTier?: AuditRiskTier;
  scoreStatus?: AuditScoreStatus;
  pageCount: number;
  createdAt?: string;
  updatedAt?: string;
  failureReason?: string;
  emailError?: string;
  attachmentCount: number;
  reportDirectory?: string;
  reportStorage?: QueueReportStorage;
  reportFiles: AnalysisReportFileView[];
  scorecard?: AuditScorecard;
  dimensions: AuditDimensionScore[];
  topIssues: AuditIssueSummary[];
  remediationRoadmap: AnalysisRemediationItem[];
}

interface RemediationTemplate {
  action: string;
  whyItMatters: string;
  effort: RemediationEffort;
}

const REMEDIATION_TEMPLATES: Record<string, RemediationTemplate> = {
  'color-contrast': {
    action: 'Increase text and control contrast so key content stays readable for older adults in low-vision and glare-heavy conditions.',
    whyItMatters: 'Low contrast makes navigation and reading materially harder for aging users and increases abandonment risk.',
    effort: 'medium',
  },
  'text-font-audit': {
    action: 'Increase base font sizes and strengthen typography hierarchy so body copy, labels, and helper text are easier to read.',
    whyItMatters: 'Legible type improves comprehension and reduces cognitive strain for adults 50+.',
    effort: 'medium',
  },
  viewport: {
    action: 'Fix viewport and zoom handling so users can scale content without losing functionality or readability.',
    whyItMatters: 'Older adults often depend on browser zoom to comfortably use a site.',
    effort: 'low',
  },
  'cumulative-layout-shift': {
    action: 'Reduce layout shifts by reserving space for dynamic content and stabilizing page loading behavior.',
    whyItMatters: 'Unexpected movement causes disorientation and makes target acquisition harder.',
    effort: 'medium',
  },
  'layout-brittle-audit': {
    action: 'Simplify brittle layout patterns that break under zoom, larger text, or smaller screens.',
    whyItMatters: 'Stable layouts are critical for older adults who rely on larger text and responsive behavior.',
    effort: 'high',
  },
  'flesch-kincaid-audit': {
    action: 'Rewrite dense content into clearer, shorter, more plain-language copy with simpler sentence structure.',
    whyItMatters: 'Clear language lowers cognitive load and improves comprehension for a wider range of users.',
    effort: 'medium',
  },
  'heading-order': {
    action: 'Fix heading structure so page sections follow a clear hierarchy and users can scan content quickly.',
    whyItMatters: 'A predictable structure improves orientation and information findability.',
    effort: 'low',
  },
  'dom-size': {
    action: 'Reduce unnecessary page complexity and excessive DOM size to improve clarity and performance.',
    whyItMatters: 'Overly complex pages increase cognitive load and can slow older devices.',
    effort: 'high',
  },
  'errors-in-console': {
    action: 'Resolve frontend runtime errors that can break interactions, forms, or dynamic content.',
    whyItMatters: 'Broken interactions directly damage trust and task completion.',
    effort: 'medium',
  },
  'interactive-color-audit': {
    action: 'Improve interactive state styling so links, buttons, and controls are clearly identifiable and consistent.',
    whyItMatters: 'Clear interactive cues help older adults understand what can be clicked or tapped.',
    effort: 'medium',
  },
  'target-size': {
    action: 'Increase tap and click target sizes for buttons, links, and controls across desktop and mobile flows.',
    whyItMatters: 'Larger targets materially improve usability for people with reduced dexterity or precision.',
    effort: 'medium',
  },
  'link-name': {
    action: 'Replace vague link labels with descriptive text that explains the destination or action.',
    whyItMatters: 'Descriptive links reduce confusion and improve navigation confidence.',
    effort: 'low',
  },
  'button-name': {
    action: 'Ensure every button has a clear accessible name and visible action label.',
    whyItMatters: 'Users need unambiguous calls to action to complete important tasks.',
    effort: 'low',
  },
  label: {
    action: 'Add explicit form labels, instructions, and helper text for all important input fields.',
    whyItMatters: 'Clear forms reduce errors and abandonment in high-friction journeys.',
    effort: 'medium',
  },
  'largest-contentful-paint': {
    action: 'Improve loading speed for key above-the-fold content so primary information appears more quickly.',
    whyItMatters: 'Slow perceived loading can look broken and reduce trust, especially in critical journeys.',
    effort: 'high',
  },
  'total-blocking-time': {
    action: 'Reduce long main-thread tasks and blocking scripts that delay user interaction.',
    whyItMatters: 'Delays in interaction create frustration and make tasks feel unreliable.',
    effort: 'high',
  },
  'is-on-https': {
    action: 'Serve the full experience over HTTPS and remove insecure resource dependencies.',
    whyItMatters: 'Security trust signals are essential for older adults sharing sensitive information.',
    effort: 'medium',
  },
  'geolocation-on-start': {
    action: 'Avoid requesting location or other intrusive permissions before users understand the benefit.',
    whyItMatters: 'Premature permission prompts increase distrust and drop-off.',
    effort: 'low',
  },
};

function normalizeDate(value: Date | string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function normalizeStatus(value: string | undefined): AnalysisStatus {
  if (value === 'processing' || value === 'completed' || value === 'failed') {
    return value;
  }

  return 'queued';
}

function normalizeEmailStatus(value: string | undefined): AnalysisEmailStatus {
  if (value === 'sending' || value === 'sent' || value === 'failed') {
    return value;
  }

  return 'pending';
}

function getImpact(issue: AuditIssueSummary): RemediationImpact {
  if (issue.severity === 'high' || issue.weight >= 8) {
    return 'high';
  }

  if (issue.severity === 'medium' || issue.weight >= 4) {
    return 'medium';
  }

  return 'low';
}

function getFallbackEffort(issue: AuditIssueSummary): RemediationEffort {
  if (issue.weight >= 8) {
    return 'high';
  }

  if (issue.weight >= 4) {
    return 'medium';
  }

  return 'low';
}

function getTemplate(issue: AuditIssueSummary): RemediationTemplate {
  return REMEDIATION_TEMPLATES[issue.auditId] || {
    action: 'Review this failing audit and implement a code or content fix that removes the accessibility barrier for older adults.',
    whyItMatters: 'This issue is contributing to a lower Silver Score and a weaker user experience for the 50+ audience.',
    effort: getFallbackEffort(issue),
  };
}

function rankImpact(impact: RemediationImpact): number {
  if (impact === 'high') {
    return 0;
  }

  if (impact === 'medium') {
    return 1;
  }

  return 2;
}

function rankEffort(effort: RemediationEffort): number {
  if (effort === 'low') {
    return 0;
  }

  if (effort === 'medium') {
    return 1;
  }

  return 2;
}

export function buildRemediationRoadmap(scorecard: AuditScorecard | undefined): AnalysisRemediationItem[] {
  if (!scorecard?.dimensions?.length) {
    return [];
  }

  const items = new Map<string, AnalysisRemediationItem>();

  for (const dimension of scorecard.dimensions) {
    for (const issue of dimension.topIssues || []) {
      const dedupeKey = `${dimension.key}:${issue.auditId}`;
      if (items.has(dedupeKey)) {
        continue;
      }

      const template = getTemplate(issue);
      const impact = getImpact(issue);

      items.set(dedupeKey, {
        id: dedupeKey,
        auditId: issue.auditId,
        title: issue.title,
        dimensionKey: dimension.key,
        dimensionLabel: dimension.label,
        severity: issue.severity,
        currentScore: issue.score,
        impact,
        effort: template.effort,
        action: template.action,
        whyItMatters: template.whyItMatters,
        ...(issue.displayValue ? { displayValue: issue.displayValue } : {}),
        ...(issue.sourceUrl ? { sourceUrl: issue.sourceUrl } : {}),
      });
    }
  }

  return [...items.values()]
    .sort((left, right) => {
      if (rankImpact(left.impact) !== rankImpact(right.impact)) {
        return rankImpact(left.impact) - rankImpact(right.impact);
      }

      if (rankEffort(left.effort) !== rankEffort(right.effort)) {
        return rankEffort(left.effort) - rankEffort(right.effort);
      }

      return left.currentScore - right.currentScore;
    })
    .slice(0, 8);
}

export function buildAnalysisDetail(record: AnalysisRecordLike): AnalysisDetailView {
  const fullName = [record.firstName, record.lastName].filter(Boolean).join(' ').trim() || undefined;
  const scorecard = record.scoreCard;
  const normalizedReportFiles = buildAnalysisReportFileViews(normalizeStoredReportFiles((record.reportFiles || []) as StoredReportFile[]));

  return {
    ...(record._id ? { id: String(record._id) } : {}),
    taskId: String(record.taskId || ''),
    url: String(record.url || ''),
    ...(record.email ? { email: String(record.email) } : {}),
    ...(fullName ? { fullName } : {}),
    ...(record.planId !== undefined ? { planId: record.planId } : {}),
    ...(record.device !== undefined ? { device: record.device } : {}),
    status: normalizeStatus(record.status),
    emailStatus: normalizeEmailStatus(record.emailStatus),
    ...(record.score !== undefined ? { score: record.score } : {}),
    ...(scorecard?.riskTier ? { riskTier: scorecard.riskTier } : {}),
    ...(scorecard?.scoreStatus ? { scoreStatus: scorecard.scoreStatus } : {}),
    pageCount: Number(scorecard?.pageCount || 0),
    ...(normalizeDate(record.createdAt) ? { createdAt: normalizeDate(record.createdAt) } : {}),
    ...(normalizeDate(record.updatedAt) ? { updatedAt: normalizeDate(record.updatedAt) } : {}),
    ...(record.failureReason ? { failureReason: record.failureReason } : {}),
    ...(record.emailError ? { emailError: record.emailError } : {}),
    attachmentCount: Number(record.attachmentCount || 0),
    ...(record.reportDirectory ? { reportDirectory: record.reportDirectory } : {}),
    ...(record.reportStorage ? { reportStorage: record.reportStorage } : {}),
    reportFiles: normalizedReportFiles,
    ...(scorecard ? { scorecard } : {}),
    dimensions: scorecard?.dimensions || [],
    topIssues: scorecard?.topIssues || [],
    remediationRoadmap: buildRemediationRoadmap(scorecard),
  };
}
