import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';
import type { AuditScorecard } from './audit-scorecard.ts';
import type { AnalysisRemediationItem } from './analysis-details.ts';

const aiReportingLogger = logger.child('feature:audits:ai-reporting');

export type AuditAiReportStatus = 'generated' | 'fallback';
export type AuditAiReportProvider = 'openai' | 'local';

export interface AuditAiReport {
  status: AuditAiReportStatus;
  provider: AuditAiReportProvider;
  model?: string;
  generatedAt: string;
  headline: string;
  summary: string;
  businessImpact: string;
  prioritySummary: string;
  topRecommendations: string[];
  stakeholderNote: string;
}

export interface GenerateAuditAiReportOptions {
  url: string;
  fullName?: string;
  scorecard: AuditScorecard;
  remediationRoadmap: AnalysisRemediationItem[];
  isLiteVersion?: boolean;
}

interface OpenAiAuditReportPayload {
  headline?: string;
  summary?: string;
  businessImpact?: string;
  prioritySummary?: string;
  topRecommendations?: unknown;
  stakeholderNote?: string;
}

function toPercent(value: number | null | undefined): string {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? `${Math.round(normalized)}%` : 'N/A';
}

function capitalize(value: string | undefined): string {
  if (!value) {
    return 'Unknown';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function limitRecommendationList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function sanitizeSentence(value: unknown, fallback: string): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function getPrimaryConcern(scorecard: AuditScorecard): string {
  const weakestDimension = [...(scorecard.dimensions || [])]
    .sort((left, right) => left.score - right.score)[0];

  if (!weakestDimension) {
    return 'overall usability';
  }

  return weakestDimension.label.toLowerCase();
}

function buildPrioritySummaryText(remediationRoadmap: AnalysisRemediationItem[]): string {
  const quickWins = remediationRoadmap.filter((item) => item.bucketKey === 'quick-wins').length;
  const mediumEffort = remediationRoadmap.filter((item) => item.bucketKey === 'medium-effort').length;
  const highEffort = remediationRoadmap.filter((item) => item.bucketKey === 'high-effort').length;

  return `Roadmap balance: ${quickWins} Quick Wins, ${mediumEffort} Medium Effort items, and ${highEffort} High Effort items. Start with lower-effort fixes that remove immediate friction, then schedule the heavier engineering and design work in a planned remediation phase.`;
}

export function buildFallbackAuditAiReport(options: GenerateAuditAiReportOptions): AuditAiReport {
  const { scorecard, remediationRoadmap, isLiteVersion } = options;
  const primaryConcern = getPrimaryConcern(scorecard);
  const topIssueTitles = (scorecard.topIssues || []).slice(0, 2).map((issue) => issue.title);
  const headline = scorecard.overallScore >= 80
    ? 'Strong foundation with focused improvements remaining'
    : scorecard.overallScore >= 70
      ? 'Usable foundation with meaningful remediation priorities'
      : 'High-friction experience for older adults that needs planned remediation';

  const summary = [
    `This ${isLiteVersion ? 'quick scan' : 'audit'} scored ${toPercent(scorecard.overallScore)} and is currently classified as ${capitalize(scorecard.riskTier)} risk.`,
    `The most significant pressure point is ${primaryConcern}, with ${scorecard.pageCount} page${scorecard.pageCount === 1 ? '' : 's'} included in the current scorecard.`,
    topIssueTitles.length > 0
      ? `The top issues currently affecting the experience are ${topIssueTitles.join(' and ')}.`
      : 'The current scorecard does not yet include enough issue detail to name specific findings.',
  ].join(' ');

  const businessImpact = scorecard.overallScore >= 80
    ? 'The site already presents a relatively strong experience for older adults, but tightening weaker journeys should improve trust, task completion, and consistency across devices.'
    : scorecard.overallScore >= 70
      ? 'The site has a workable base, but current friction points are likely increasing hesitation, mis-clicks, reading effort, and drop-off in important journeys for older adults.'
      : 'The current experience is likely creating meaningful barriers for older adults in reading, navigation, and task completion, which can reduce trust and conversion in high-value journeys.';

  const topRecommendations = remediationRoadmap.length > 0
    ? remediationRoadmap.slice(0, 4).map((item) => item.action)
    : [
      'Review the weakest score category first and remove the most obvious barriers to reading, navigation, and interaction.',
      'Prioritize issues that affect core tasks before expanding into longer-term refinements.',
      'Retest after remediation to confirm that score improvements translate into a clearer user experience for older adults.',
    ];

  return {
    status: 'fallback',
    provider: 'local',
    generatedAt: new Date().toISOString(),
    headline,
    summary,
    businessImpact,
    prioritySummary: buildPrioritySummaryText(remediationRoadmap),
    topRecommendations,
    stakeholderNote: 'This summary is intended to support prioritization and reporting. It does not by itself certify compliance, legal coverage, or accessibility conformance.',
  };
}

function buildPromptPayload(options: GenerateAuditAiReportOptions): string {
  const compactPayload = {
    url: options.url,
    audience: 'Older adults, especially 50+ users',
    isLiteVersion: Boolean(options.isLiteVersion),
    scorecard: {
      overallScore: options.scorecard.overallScore,
      riskTier: options.scorecard.riskTier,
      scoreStatus: options.scorecard.scoreStatus,
      pageCount: options.scorecard.pageCount,
      dimensions: (options.scorecard.dimensions || []).map((dimension) => ({
        label: dimension.label,
        score: dimension.score,
        issueCount: dimension.issueCount,
      })),
      evaluationDimensions: (options.scorecard.evaluationDimensions || []).map((dimension) => ({
        label: dimension.label,
        score: dimension.score,
        issueCount: dimension.issueCount,
      })),
      topIssues: (options.scorecard.topIssues || []).slice(0, 5).map((issue) => ({
        title: issue.title,
        score: issue.score,
        severity: issue.severity,
        auditSourceLabel: issue.auditSourceLabel,
        wcagCriteria: issue.wcagCriteria || [],
      })),
    },
    roadmap: options.remediationRoadmap.slice(0, 5).map((item) => ({
      title: item.title,
      bucket: item.bucketLabel,
      impact: item.impact,
      effort: item.effort,
      dimension: item.dimensionLabel,
      evaluationDimension: item.evaluationDimensionLabel,
      action: item.action,
    })),
  };

  return JSON.stringify(compactPayload, null, 2);
}

function extractResponseText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  const outputItems = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of outputItems) {
    const contentItems = Array.isArray(item?.content) ? item.content : [];
    for (const content of contentItems) {
      if (typeof content?.text === 'string' && content.text.trim()) {
        return content.text;
      }
    }
  }

  return '';
}

function extractJsonObject(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return '';
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeOpenAiReport(
  payload: OpenAiAuditReportPayload,
  fallback: AuditAiReport,
): AuditAiReport {
  const topRecommendations = limitRecommendationList(payload.topRecommendations);

  return {
    status: 'generated',
    provider: 'openai',
    model: env.openAiModel,
    generatedAt: new Date().toISOString(),
    headline: sanitizeSentence(payload.headline, fallback.headline),
    summary: sanitizeSentence(payload.summary, fallback.summary),
    businessImpact: sanitizeSentence(payload.businessImpact, fallback.businessImpact),
    prioritySummary: sanitizeSentence(payload.prioritySummary, fallback.prioritySummary),
    topRecommendations: topRecommendations.length > 0 ? topRecommendations : fallback.topRecommendations,
    stakeholderNote: sanitizeSentence(payload.stakeholderNote, fallback.stakeholderNote),
  };
}

async function requestOpenAiAuditReport(options: GenerateAuditAiReportOptions, fallback: AuditAiReport): Promise<AuditAiReport> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.openAiTimeoutMs);

  try {
    const response = await fetch(`${env.openAiBaseUrl.replace(/\/$/, '')}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: env.openAiModel,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: [
                  'You create concise, business-friendly accessibility audit summaries for the SilverSurfers platform.',
                  'Write for a business stakeholder, not a developer.',
                  'Focus on older-adult usability, trust, task completion, and prioritization.',
                  'Do not claim certification, guaranteed compliance, or legal outcomes.',
                  'Return only valid JSON with these keys: headline, summary, businessImpact, prioritySummary, topRecommendations, stakeholderNote.',
                  'topRecommendations must be an array of 3 to 5 one-sentence recommendations.',
                ].join(' '),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: buildPromptPayload(options),
              },
            ],
          },
        ],
        temperature: 0.3,
        max_output_tokens: 900,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`OpenAI API error (${response.status}): ${errorBody || response.statusText}`);
    }

    const payload = await response.json();
    const outputText = extractResponseText(payload);
    const parsed = JSON.parse(extractJsonObject(outputText)) as OpenAiAuditReportPayload;
    return normalizeOpenAiReport(parsed, fallback);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAuditAiReport(options: GenerateAuditAiReportOptions): Promise<AuditAiReport> {
  const fallback = buildFallbackAuditAiReport(options);

  if (!env.openAiApiKey) {
    return fallback;
  }

  try {
    return await requestOpenAiAuditReport(options, fallback);
  } catch (error) {
    aiReportingLogger.warn('OpenAI audit summary generation failed. Falling back to local narrative.', {
      url: options.url,
      model: env.openAiModel,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

export function buildAuditAiReportMarkdown(aiReport: AuditAiReport, options: { url: string }): string {
  const lines = [
    '# AI Executive Summary',
    '',
    `- URL: ${options.url}`,
    `- Status: ${aiReport.status}`,
    `- Provider: ${aiReport.provider}`,
    ...(aiReport.model ? [`- Model: ${aiReport.model}`] : []),
    `- Generated At: ${aiReport.generatedAt}`,
    '',
    `## ${aiReport.headline}`,
    '',
    aiReport.summary,
    '',
    '## Business Impact',
    '',
    aiReport.businessImpact,
    '',
    '## Priority Summary',
    '',
    aiReport.prioritySummary,
    '',
    '## Top Recommendations',
    '',
    ...aiReport.topRecommendations.map((recommendation) => `- ${recommendation}`),
    '',
    '## Stakeholder Note',
    '',
    aiReport.stakeholderNote,
    '',
  ];

  return lines.join('\n');
}
