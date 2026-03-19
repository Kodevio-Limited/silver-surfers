import customConfig from './scanner/custom-config.js';
import customConfigLite from './scanner/custom-config-lite.js';

export type AuditRiskTier = 'low' | 'medium' | 'high';
export type AuditScoreStatus = 'pass' | 'needs-improvement' | 'fail';
export type AuditDimensionKey = 'visualClarity' | 'cognitiveLoad' | 'motorAccessibility' | 'contentTrust';

export interface AuditIssueSummary {
  auditId: string;
  title: string;
  description: string;
  score: number;
  weight: number;
  severity: AuditRiskTier;
  displayValue?: string;
  sourceUrl?: string;
}

export interface AuditDimensionScore {
  key: AuditDimensionKey;
  label: string;
  score: number;
  weight: number;
  issueCount: number;
  topIssues: AuditIssueSummary[];
}

export interface AuditPlatformScore {
  key: string;
  label: string;
  score: number;
  pageCount: number;
}

export interface AuditScorecard {
  methodologyVersion: string;
  categoryId: string;
  overallScore: number;
  riskTier: AuditRiskTier;
  scoreStatus: AuditScoreStatus;
  pageCount: number;
  evaluatedAt: string;
  dimensions: AuditDimensionScore[];
  topIssues: AuditIssueSummary[];
  platforms: AuditPlatformScore[];
}

interface CategoryAuditRef {
  id: string;
  weight: number;
}

interface LighthouseAuditResultLike {
  title?: string;
  description?: string;
  score?: number | null;
  displayValue?: string;
}

interface LighthouseReportLike {
  audits?: Record<string, LighthouseAuditResultLike | undefined>;
}

interface BuildAuditScorecardOptions {
  isLiteVersion?: boolean;
  pageUrl?: string;
}

interface BuildAggregateAuditScorecardOptions {
  categoryId?: string;
  pageCount?: number;
  platforms?: AuditPlatformScore[];
}

const SCORECARD_METHOD_VERSION = 'silver-score-v1';
const FULL_CATEGORY_ID = 'senior-friendly';
const LITE_CATEGORY_ID = 'senior-friendly-lite';

const DIMENSION_LABELS: Record<AuditDimensionKey, string> = {
  visualClarity: 'Visual Clarity',
  cognitiveLoad: 'Cognitive Load',
  motorAccessibility: 'Motor Accessibility',
  contentTrust: 'Content & Trust',
};

const DIMENSION_ORDER: AuditDimensionKey[] = [
  'visualClarity',
  'cognitiveLoad',
  'motorAccessibility',
  'contentTrust',
];

const AUDIT_DIMENSION_MAP: Record<string, AuditDimensionKey> = {
  'color-contrast': 'visualClarity',
  'text-font-audit': 'visualClarity',
  'viewport': 'visualClarity',
  'cumulative-layout-shift': 'visualClarity',
  'layout-brittle-audit': 'visualClarity',
  'flesch-kincaid-audit': 'cognitiveLoad',
  'heading-order': 'cognitiveLoad',
  'dom-size': 'cognitiveLoad',
  'errors-in-console': 'cognitiveLoad',
  'interactive-color-audit': 'cognitiveLoad',
  'target-size': 'motorAccessibility',
  'link-name': 'motorAccessibility',
  'button-name': 'motorAccessibility',
  'label': 'motorAccessibility',
  'largest-contentful-paint': 'contentTrust',
  'total-blocking-time': 'contentTrust',
  'is-on-https': 'contentTrust',
  'geolocation-on-start': 'contentTrust',
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampAuditScore(value: number | null | undefined): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, Number(value)));
}

function classifyScoreStatus(overallScore: number): AuditScoreStatus {
  if (overallScore >= 80) {
    return 'pass';
  }

  if (overallScore >= 70) {
    return 'needs-improvement';
  }

  return 'fail';
}

function classifyRiskTier(overallScore: number): AuditRiskTier {
  if (overallScore >= 80) {
    return 'low';
  }

  if (overallScore >= 70) {
    return 'medium';
  }

  return 'high';
}

function classifyIssueSeverity(score: number): AuditRiskTier {
  if (score >= 0.9) {
    return 'low';
  }

  if (score >= 0.7) {
    return 'medium';
  }

  return 'high';
}

function getCategoryAuditRefs(categoryId: string): CategoryAuditRef[] {
  const source = categoryId === LITE_CATEGORY_ID ? customConfigLite : customConfig;
  const category = source?.categories?.[categoryId];

  if (!category?.auditRefs || !Array.isArray(category.auditRefs)) {
    return [];
  }

  return category.auditRefs
    .map((auditRef: any) => ({
      id: String(auditRef.id || ''),
      weight: Number(auditRef.weight) || 0,
    }))
    .filter((auditRef: any) => auditRef.id && auditRef.weight > 0);
}

function getDimensionKey(auditId: string): AuditDimensionKey {
  return AUDIT_DIMENSION_MAP[auditId] || 'contentTrust';
}

function createEmptyDimensionScore(key: AuditDimensionKey): AuditDimensionScore {
  return {
    key,
    label: DIMENSION_LABELS[key],
    score: 0,
    weight: 0,
    issueCount: 0,
    topIssues: [],
  };
}

function sortIssues(issues: AuditIssueSummary[]): AuditIssueSummary[] {
  return [...issues].sort((left, right) => {
    if (left.score !== right.score) {
      return left.score - right.score;
    }

    if (left.weight !== right.weight) {
      return right.weight - left.weight;
    }

    return left.auditId.localeCompare(right.auditId);
  });
}

export function buildAuditScorecard(
  report: LighthouseReportLike,
  options: BuildAuditScorecardOptions = {},
): AuditScorecard {
  const categoryId = options.isLiteVersion ? LITE_CATEGORY_ID : FULL_CATEGORY_ID;
  const auditRefs = getCategoryAuditRefs(categoryId);
  const audits = report?.audits || {};

  const dimensionIssues = new Map<AuditDimensionKey, AuditIssueSummary[]>();
  const dimensionWeightedScores = new Map<AuditDimensionKey, number>();
  const dimensionWeights = new Map<AuditDimensionKey, number>();
  const dimensionIssueCounts = new Map<AuditDimensionKey, number>();

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const key of DIMENSION_ORDER) {
    dimensionIssues.set(key, []);
    dimensionWeightedScores.set(key, 0);
    dimensionWeights.set(key, 0);
    dimensionIssueCounts.set(key, 0);
  }

  for (const auditRef of auditRefs) {
    const audit = audits[auditRef.id];
    const score = clampAuditScore(audit?.score);
    const dimensionKey = getDimensionKey(auditRef.id);

    totalWeightedScore += score * auditRef.weight;
    totalWeight += auditRef.weight;

    dimensionWeightedScores.set(
      dimensionKey,
      (dimensionWeightedScores.get(dimensionKey) || 0) + (score * auditRef.weight),
    );
    dimensionWeights.set(
      dimensionKey,
      (dimensionWeights.get(dimensionKey) || 0) + auditRef.weight,
    );

    if (score < 0.999) {
      dimensionIssueCounts.set(
        dimensionKey,
        (dimensionIssueCounts.get(dimensionKey) || 0) + 1,
      );
      dimensionIssues.get(dimensionKey)?.push({
        auditId: auditRef.id,
        title: audit?.title || auditRef.id,
        description: audit?.description || '',
        score: roundScore(score * 100),
        weight: auditRef.weight,
        severity: classifyIssueSeverity(score),
        ...(audit?.displayValue ? { displayValue: audit.displayValue } : {}),
        ...(options.pageUrl ? { sourceUrl: options.pageUrl } : {}),
      });
    }
  }

  const overallScore = totalWeight > 0 ? roundScore((totalWeightedScore / totalWeight) * 100) : 0;

  const dimensions = DIMENSION_ORDER.map((dimensionKey) => {
    const weight = dimensionWeights.get(dimensionKey) || 0;
    const weightedScore = dimensionWeightedScores.get(dimensionKey) || 0;
    const score = weight > 0 ? roundScore((weightedScore / weight) * 100) : 0;
    const issues = sortIssues(dimensionIssues.get(dimensionKey) || []).slice(0, 3);

    return {
      key: dimensionKey,
      label: DIMENSION_LABELS[dimensionKey],
      score,
      weight,
      issueCount: dimensionIssueCounts.get(dimensionKey) || 0,
      topIssues: issues,
    };
  });

  const topIssues = sortIssues(dimensions.flatMap((dimension) => dimension.topIssues)).slice(0, 5);

  return {
    methodologyVersion: SCORECARD_METHOD_VERSION,
    categoryId,
    overallScore,
    riskTier: classifyRiskTier(overallScore),
    scoreStatus: classifyScoreStatus(overallScore),
    pageCount: 1,
    evaluatedAt: new Date().toISOString(),
    dimensions,
    topIssues,
    platforms: [],
  };
}

export function buildAggregateAuditScorecard(
  scorecards: AuditScorecard[],
  options: BuildAggregateAuditScorecardOptions = {},
): AuditScorecard {
  if (!scorecards.length) {
    return {
      methodologyVersion: SCORECARD_METHOD_VERSION,
      categoryId: options.categoryId || FULL_CATEGORY_ID,
      overallScore: 0,
      riskTier: 'high',
      scoreStatus: 'fail',
      pageCount: options.pageCount || 0,
      evaluatedAt: new Date().toISOString(),
      dimensions: DIMENSION_ORDER.map((key) => createEmptyDimensionScore(key)),
      topIssues: [],
      platforms: options.platforms || [],
    };
  }

  const dimensionScores = new Map<AuditDimensionKey, number[]>();
  const dimensionIssues = new Map<AuditDimensionKey, AuditIssueSummary[]>();
  const dimensionWeights = new Map<AuditDimensionKey, number>();

  for (const key of DIMENSION_ORDER) {
    dimensionScores.set(key, []);
    dimensionIssues.set(key, []);
    dimensionWeights.set(key, 0);
  }

  const allIssues: AuditIssueSummary[] = [];
  let overallScoreSum = 0;
  let pageCount = 0;

  for (const scorecard of scorecards) {
    overallScoreSum += Number(scorecard.overallScore) || 0;
    pageCount += Number(scorecard.pageCount) || 1;

    for (const dimension of scorecard.dimensions || []) {
      dimensionScores.get(dimension.key)?.push(Number(dimension.score) || 0);
      dimensionWeights.set(dimension.key, Number(dimension.weight) || 0);

      const topIssues = Array.isArray(dimension.topIssues) ? dimension.topIssues : [];
      dimensionIssues.get(dimension.key)?.push(...topIssues);
      allIssues.push(...topIssues);
    }
  }

  const overallScore = roundScore(overallScoreSum / scorecards.length);
  const dimensions = DIMENSION_ORDER.map((dimensionKey) => {
    const scores = dimensionScores.get(dimensionKey) || [];
    const score = scores.length
      ? roundScore(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const issues = sortIssues(dimensionIssues.get(dimensionKey) || []).slice(0, 3);

    return {
      key: dimensionKey,
      label: DIMENSION_LABELS[dimensionKey],
      score,
      weight: dimensionWeights.get(dimensionKey) || 0,
      issueCount: (dimensionIssues.get(dimensionKey) || []).length,
      topIssues: issues,
    };
  });

  return {
    methodologyVersion: SCORECARD_METHOD_VERSION,
    categoryId: options.categoryId || scorecards[0].categoryId || FULL_CATEGORY_ID,
    overallScore,
    riskTier: classifyRiskTier(overallScore),
    scoreStatus: classifyScoreStatus(overallScore),
    pageCount: options.pageCount || pageCount,
    evaluatedAt: new Date().toISOString(),
    dimensions,
    topIssues: sortIssues(allIssues).slice(0, 5),
    platforms: options.platforms || [],
  };
}
