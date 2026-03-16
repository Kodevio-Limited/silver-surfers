import fs from 'node:fs/promises';
import path from 'node:path';

import { InternalLinksExtractor } from '../../../my-app/services/internal_links/internal_links.js';
import { runLighthouseAudit } from '../../../my-app/services/load_and_audit/audit.js';
import { logger } from '../../config/logger.ts';
import { resolveBackendPath } from '../../config/paths.ts';
import type { QueueJobInput, QueueResult } from '../../infrastructure/queues/job-queue.ts';
import { buildAggregateAuditScorecard, buildAuditScorecard, type AuditPlatformScore, type AuditScorecard } from './audit-scorecard.ts';
import { getAnalysisRecordModel, getSubscriptionModel, type AnalysisRecordDocument } from './audits.dependencies.ts';
import {
  applyFullAuditEmailResult,
  buildFullAuditEmailContent,
  buildSealResultsFilePath,
  finalizeFullAuditRecord,
  resolveDevicesToAudit,
  sanitizePathSegment,
  type FullAuditDevice,
  type FullAuditEmailResult,
} from './full-audit.helpers.ts';
import { collectAttachmentsRecursive, sendAuditReportEmail, sendDirectMail, type ReportAttachment } from './report-delivery.ts';
import { buildStoredReportFilesFromAttachments, mergeStoredReportFilesWithStorage } from './report-files.ts';
import { cleanupLocalReportDirectoryWhenStored } from './report-retention.ts';
import { checkScoreThreshold } from './threshold-check.ts';
import {
  calculateSeniorFriendlinessScore,
  generateCombinedPlatformReport,
  generateSeniorAccessibilityReport,
  generateSummaryPDF,
  mergePDFsByPlatform,
  type FullAuditPlatformReport,
} from './report-generation.ts';

const fullAuditLogger = logger.child('feature:audits:full-audit');

interface FullAuditJobPayload {
  email: string;
  url: string;
  userId?: string;
  taskId?: string;
  planId?: string | null;
  selectedDevice?: string | null;
  firstName?: string;
  lastName?: string;
  subscriptionId?: string | null;
}

interface InternalLinksExtractionResult {
  success: boolean;
  links: string[];
  details?: string;
}

interface InternalLinksExtractorInstance {
  extractInternalLinks(url: string): Promise<InternalLinksExtractionResult>;
}

interface LighthouseAuditResult {
  success: boolean;
  reportPath?: string;
  error?: string;
  errorCode?: string;
}

interface ThresholdCheckResult {
  pass: boolean;
}

interface FullAuditReportEntry extends FullAuditPlatformReport {
  scoreCard: AuditScorecard | null;
}

function requireString(value: unknown, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${field} is required.`);
  }

  return normalized;
}

function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
  return normalized || undefined;
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return value as null | undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function toFullAuditJobPayload(payload: QueueJobInput): FullAuditJobPayload {
  return {
    email: requireString(payload.email, 'Full audit email'),
    url: requireString(payload.url, 'Full audit URL'),
    userId: optionalString(payload.userId),
    taskId: optionalString(payload.taskId),
    planId: optionalNullableString(payload.planId),
    selectedDevice: optionalNullableString(payload.selectedDevice),
    firstName: optionalString(payload.firstName),
    lastName: optionalString(payload.lastName),
    subscriptionId: optionalNullableString(payload.subscriptionId),
  };
}

async function resolveEffectivePlanId(
  planId: string | null | undefined,
  subscriptionId: string | null | undefined,
): Promise<string> {
  if (planId) {
    return planId;
  }

  if (subscriptionId) {
    try {
      const Subscription = await getSubscriptionModel();
      const subscription = await Subscription.findById(subscriptionId).lean();
      if (subscription?.planId) {
        return subscription.planId;
      }
    } catch (error) {
      fullAuditLogger.warn('Plan lookup failed for subscription.', {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return 'starter';
}

async function findOrCreateAnalysisRecord(job: FullAuditJobPayload, planId: string, finalReportFolder: string): Promise<AnalysisRecordDocument> {
  const AnalysisRecord = await getAnalysisRecordModel();

  let record: AnalysisRecordDocument | null = null;

  if (job.taskId) {
    record = await AnalysisRecord.findOne({ taskId: job.taskId });
  }

  if (!record) {
    record = await AnalysisRecord.findOne(
      { email: job.email, url: job.url, status: 'queued' },
      {},
      { sort: { createdAt: -1 } },
    );
  }

  if (!record) {
    record = await AnalysisRecord.create({
      user: job.userId || undefined,
      email: job.email,
      firstName: job.firstName || '',
      lastName: job.lastName || '',
      url: job.url,
      taskId: job.taskId,
      status: 'queued',
      emailStatus: 'pending',
      reportDirectory: finalReportFolder,
      planId,
      device: job.selectedDevice || null,
    });
  } else {
    if (!record.taskId && job.taskId) {
      record.taskId = job.taskId;
    }
    if (!record.planId) {
      record.planId = planId;
    }
    if (!record.reportDirectory) {
      record.reportDirectory = finalReportFolder;
    }
    if (!record.device && job.selectedDevice) {
      record.device = job.selectedDevice;
    }
  }

  record.status = 'processing';
  record.reportDirectory = finalReportFolder;
  await record.save().catch((error) => {
    fullAuditLogger.warn('Failed to persist processing state for analysis record.', {
      taskId: job.taskId,
      email: job.email,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return record;
}

async function extractLinksToAudit(url: string): Promise<string[]> {
  const extractor = new InternalLinksExtractor();
  const extractionResult = await extractor.extractInternalLinks(url);

  if (!extractionResult.success) {
    throw new Error(`Link extraction failed: ${extractionResult.details || 'Unknown error'}`);
  }

  return extractionResult.links;
}

async function auditLinkForDevice(
  link: string,
  device: FullAuditDevice,
  finalReportFolder: string,
): Promise<FullAuditReportEntry | null> {
  const auditResult = await runLighthouseAudit({ url: link, device, format: 'json' });

  if (!auditResult.success || !auditResult.reportPath) {
    fullAuditLogger.error('Skipping failed full-audit page scan.', {
      url: link,
      device,
      error: auditResult.error || 'Unknown audit error',
      errorCode: auditResult.errorCode,
    });
    return null;
  }

  const reportData = JSON.parse(await fs.readFile(auditResult.reportPath, 'utf8')) as Record<string, unknown>;

  let auditScore: number | null = null;
  let auditScoreCard: AuditScorecard | null = null;

  try {
    const scoreData = await calculateSeniorFriendlinessScore(reportData);
    auditScore = Number.isFinite(scoreData.finalScore) ? scoreData.finalScore : null;
    auditScoreCard = buildAuditScorecard(reportData, { pageUrl: link });
  } catch (error) {
    fullAuditLogger.warn('Failed to build scorecard for page audit.', {
      url: link,
      device,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const persistentJsonPath = path.join(
    finalReportFolder,
    `report-${device}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  );
  await fs.copyFile(auditResult.reportPath, persistentJsonPath);
  await fs.unlink(auditResult.reportPath).catch(() => undefined);

  return {
    jsonReportPath: persistentJsonPath,
    url: link,
    imagePaths: {},
    score: auditScore,
    scoreCard: auditScoreCard,
  };
}

async function generatePlatformReports(
  reportsByPlatform: Partial<Record<FullAuditDevice, FullAuditReportEntry[]>>,
  email: string,
  planId: string,
  finalReportFolder: string,
): Promise<void> {
  for (const [deviceKey, reports] of Object.entries(reportsByPlatform)) {
    const device = deviceKey as FullAuditDevice;
    if (!reports || reports.length === 0) {
      continue;
    }

    const individualPdfPaths: string[] = [];
    for (const report of reports) {
      try {
        await new Promise<void>((resolve) => setImmediate(resolve));
        const pdfResult = await generateSeniorAccessibilityReport({
          inputFile: report.jsonReportPath,
          url: report.url,
          email_address: email,
          device,
          imagePaths: report.imagePaths,
          outputDir: finalReportFolder,
          formFactor: device,
          planType: planId,
        });

        if (pdfResult?.reportPath) {
          individualPdfPaths.push(pdfResult.reportPath);
        }
      } catch (error) {
        fullAuditLogger.error('Failed to generate individual PDF.', {
          url: report.url,
          device,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (individualPdfPaths.length > 0) {
      try {
        await mergePDFsByPlatform({
          pdfPaths: individualPdfPaths,
          device,
          email_address: email,
          outputDir: finalReportFolder,
          reports,
          planType: planId,
        });
      } catch (mergeError) {
        fullAuditLogger.warn('Combined PDF merge failed. Falling back to summary PDF.', {
          device,
          error: mergeError instanceof Error ? mergeError.message : String(mergeError),
        });

        await generateCombinedPlatformReport({
          reports,
          device,
          email_address: email,
          outputDir: finalReportFolder,
          planType: planId,
          individualPdfPaths,
        }).catch((summaryError) => {
          fullAuditLogger.error('Fallback combined platform PDF generation failed.', {
            device,
            error: summaryError instanceof Error ? summaryError.message : String(summaryError),
          });
        });
      }
    }

    for (const report of reports) {
      if (report.jsonReportPath.startsWith(finalReportFolder)) {
        await fs.unlink(report.jsonReportPath).catch(() => undefined);
      }
    }
  }
}

function buildPlatformSummary(reportsByPlatform: Partial<Record<FullAuditDevice, FullAuditReportEntry[]>>): Array<{ platform: string; score: number | null }> {
  return Object.entries(reportsByPlatform).map(([deviceKey, reports]) => {
    const scores = (reports || [])
      .map((entry) => entry.score)
      .filter((score): score is number => score !== null && score !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null;

    return {
      platform: deviceKey.charAt(0).toUpperCase() + deviceKey.slice(1),
      score: averageScore,
    };
  });
}

async function persistAggregateScorecard(
  record: AnalysisRecordDocument,
  reportsByPlatform: Partial<Record<FullAuditDevice, FullAuditReportEntry[]>>,
): Promise<void> {
  const platformScorecards: AuditPlatformScore[] = [];
  const allScorecards: AuditScorecard[] = [];

  for (const [deviceKey, reports] of Object.entries(reportsByPlatform)) {
    const device = deviceKey as FullAuditDevice;
    const deviceScorecards = (reports || [])
      .map((report) => report.scoreCard)
      .filter((scoreCard): scoreCard is AuditScorecard => Boolean(scoreCard));

    allScorecards.push(...deviceScorecards);

    if (deviceScorecards.length > 0) {
      const deviceAggregate = buildAggregateAuditScorecard(deviceScorecards, {
        pageCount: deviceScorecards.length,
      });

      platformScorecards.push({
        key: device,
        label: device.charAt(0).toUpperCase() + device.slice(1),
        score: deviceAggregate.overallScore,
        pageCount: deviceScorecards.length,
      });
    }
  }

  if (allScorecards.length === 0) {
    return;
  }

  const aggregateScorecard = buildAggregateAuditScorecard(allScorecards, {
    pageCount: allScorecards.length,
    platforms: platformScorecards,
  });

  record.score = aggregateScorecard.overallScore;
  record.scoreCard = aggregateScorecard;
  await record.save().catch((error) => {
    fullAuditLogger.warn('Failed to persist aggregate full-audit scorecard.', {
      taskId: record.taskId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

async function sendAuditEmail(
  email: string,
  planId: string,
  selectedDevice: string | null | undefined,
  finalReportFolder: string,
): Promise<FullAuditEmailResult> {
  const emailContent = buildFullAuditEmailContent(planId, selectedDevice);

  return Promise.race([
    sendAuditReportEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      folderPath: finalReportFolder,
      deviceFilter: emailContent.deviceFilter,
    }),
    new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new Error('Email sending timed out after 5 minutes')), 300_000);
    }),
  ]);
}

async function maybeSendSealOfApproval(email: string, url: string, planId: string): Promise<void> {
  if (planId !== 'pro') {
    return;
  }

  const resultsFile = buildSealResultsFilePath(email, url);
  let urlScores: Array<{ Url?: string; score?: number | string }> = [];

  try {
    const fileContent = await fs.readFile(resultsFile, 'utf8');
    urlScores = JSON.parse(fileContent) as Array<{ Url?: string; score?: number | string }>;
  } catch (error) {
    fullAuditLogger.warn('Could not read results.json for threshold check.', {
      email,
      url,
      resultsFile,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const result = checkScoreThreshold(urlScores, 80, { verbose: true });
  if (!result.pass) {
    return;
  }

  const sealPath = resolveBackendPath('assets', 'silversurfers-seal.png');
  try {
    await fs.access(sealPath);
  } catch {
    fullAuditLogger.warn('Seal image is missing, skipping seal email.', {
      sealPath,
    });
    return;
  }

  await sendDirectMail({
    to: email,
    subject: 'SilverSurfers Seal of Approval - Congratulations!',
    html: `
      <div style="font-family: Arial,sans-serif;background:#f7f7fb;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="padding:20px 24px;border-bottom:1px solid #eef2f7;background:linear-gradient(135deg,#059669 0%,#2563eb 100%);color:#fff;">
            <h1 style="margin:0;font-size:20px;">SilverSurfers Seal of Approval</h1>
          </div>
          <div style="padding:24px;color:#111827;">
            <p style="margin:0 0 12px 0;line-height:1.6;">Congrats! Your site passed our senior accessibility threshold.</p>
            <p style="margin:0 0 16px 0;line-height:1.6;">As a Pro subscriber, you've earned the SilverSurfers Seal. You can display this seal on your website.</p>
            <p style="margin:0 0 12px 0;line-height:1.6;">Guidelines: Place on pages that meet the accessibility bar; link to your latest report if you like.</p>
          </div>
        </div>
      </div>`,
    attachments: [
      {
        filename: 'silversurfers-seal.png',
        path: sealPath,
        contentType: 'image/png',
      },
    ],
  });
}

async function updateUsageCounters(record: AnalysisRecordDocument): Promise<void> {
  if (!record.user) {
    return;
  }

  const Subscription = await getSubscriptionModel();

  if (record.status === 'failed') {
    await Subscription.findOneAndUpdate(
      { user: record.user, status: { $in: ['active', 'trialing'] } },
      { $inc: { 'usage.scansThisMonth': -1 } },
    ).catch((error) => {
      fullAuditLogger.warn('Failed to decrement usage counter for failed scan.', {
        taskId: record.taskId,
        userId: record.user,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return;
  }

  if (record.status === 'completed') {
    await Subscription.findOneAndUpdate(
      { user: record.user, status: { $in: ['active', 'trialing'] } },
      { $inc: { 'usage.totalScans': 1 } },
    ).catch((error) => {
      fullAuditLogger.warn('Failed to increment total scans for completed audit.', {
        taskId: record.taskId,
        userId: record.user,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

export async function runFullAuditProcess(payload: QueueJobInput): Promise<QueueResult> {
  const job = toFullAuditJobPayload(payload);
  const fullName = [job.firstName, job.lastName].filter(Boolean).join(' ') || 'Valued Customer';

  const effectivePlanId = await resolveEffectivePlanId(job.planId, job.subscriptionId);
  const effectiveTaskId = job.taskId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const finalReportFolder = resolveBackendPath(
    'reports-full',
    sanitizePathSegment(job.email),
    `${effectiveTaskId}-${sanitizePathSegment(job.url, 50)}`,
  );
  const jobFolder = resolveBackendPath('reports', `${sanitizePathSegment(job.email)}-${Date.now()}`);

  let record: AnalysisRecordDocument | undefined;

  fullAuditLogger.info('Starting full audit job.', {
    email: job.email,
    url: job.url,
    taskId: effectiveTaskId,
    planId: effectivePlanId,
    selectedDevice: job.selectedDevice,
    fullName,
  });

  await fs.mkdir(finalReportFolder, { recursive: true });
  await fs.mkdir(jobFolder, { recursive: true });

  try {
    record = await findOrCreateAnalysisRecord(
      { ...job, taskId: effectiveTaskId },
      effectivePlanId,
      finalReportFolder,
    );

    const linksToAudit = await extractLinksToAudit(job.url);
    const devicesToAudit = resolveDevicesToAudit(effectivePlanId, job.selectedDevice);
    const reportsByPlatform: Partial<Record<FullAuditDevice, FullAuditReportEntry[]>> = {};

    fullAuditLogger.info('Resolved pages and devices for full audit.', {
      email: job.email,
      taskId: effectiveTaskId,
      pageCount: linksToAudit.length,
      devices: devicesToAudit,
    });

    for (const link of linksToAudit) {
      for (const device of devicesToAudit) {
        const reportEntry = await auditLinkForDevice(link, device, finalReportFolder).catch((error) => {
          fullAuditLogger.error('Unexpected error while auditing page.', {
            url: link,
            device,
            taskId: effectiveTaskId,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        });

        if (!reportEntry) {
          continue;
        }

        if (!reportsByPlatform[device]) {
          reportsByPlatform[device] = [];
        }

        reportsByPlatform[device]?.push(reportEntry);
      }
    }

    await generatePlatformReports(reportsByPlatform, job.email, effectivePlanId, finalReportFolder);
    await persistAggregateScorecard(record, reportsByPlatform);

    const platformSummary = buildPlatformSummary(reportsByPlatform);
    if (platformSummary.length > 0) {
      const summaryPdfPath = path.join(finalReportFolder, 'audit-summary.pdf');
      await generateSummaryPDF(platformSummary, summaryPdfPath).catch((error) => {
        fullAuditLogger.warn('Failed to generate full-audit summary PDF.', {
          taskId: effectiveTaskId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    const attachmentsPreview = await collectAttachmentsRecursive(finalReportFolder).catch((error) => {
      fullAuditLogger.warn('Failed to collect full-audit attachments preview.', {
        taskId: effectiveTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [] as ReportAttachment[];
    });

    record.attachmentCount = Array.isArray(attachmentsPreview) ? attachmentsPreview.length : 0;
    record.reportFiles = buildStoredReportFilesFromAttachments(Array.isArray(attachmentsPreview) ? attachmentsPreview : []);
    record.emailStatus = 'sending';
    await record.save().catch((error) => {
      fullAuditLogger.warn('Failed to persist full-audit attachment preview metadata.', {
        taskId: effectiveTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    const sendResult = await sendAuditEmail(job.email, effectivePlanId, job.selectedDevice, finalReportFolder)
      .catch((error) => ({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }));

    if (sendResult.success) {
      await sleep(10_000);
    }

    applyFullAuditEmailResult(record, sendResult, finalReportFolder);
    record.reportFiles = mergeStoredReportFilesWithStorage(
      buildStoredReportFilesFromAttachments(Array.isArray(attachmentsPreview) ? attachmentsPreview : []),
      sendResult.storage,
    );
    finalizeFullAuditRecord(record, sendResult);
    await updateUsageCounters(record);
    await record.save().catch((error) => {
      fullAuditLogger.warn('Failed to persist final full-audit record state.', {
        taskId: effectiveTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    if (record.status === 'completed') {
      await maybeSendSealOfApproval(job.email, job.url, effectivePlanId).catch((error) => {
        fullAuditLogger.warn('Failed to send seal of approval email.', {
          taskId: effectiveTaskId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    await cleanupLocalReportDirectoryWhenStored({
      reportDirectory: finalReportFolder,
      reportStorage: record.reportStorage,
      taskId: effectiveTaskId,
      source: 'full-audit',
    }).catch((cleanupError) => {
      fullAuditLogger.warn('Failed to remove local full-audit reports after S3 upload.', {
        taskId: effectiveTaskId,
        reportDirectory: finalReportFolder,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      });
    });

    fullAuditLogger.info('Completed full audit job.', {
      email: job.email,
      url: job.url,
      taskId: effectiveTaskId,
      status: record.status,
      attachmentCount: record.attachmentCount,
      retainedReportFolder: record.reportStorage?.provider === 's3' ? undefined : finalReportFolder,
    });

    return {
      emailStatus: record.emailStatus || 'sent',
      attachmentCount: record.attachmentCount || 0,
      reportDirectory: record.reportDirectory || finalReportFolder,
      reportStorage: record.reportStorage,
      scansUsed: 1,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    fullAuditLogger.error('Full audit job failed.', {
      email: job.email,
      url: job.url,
      taskId: effectiveTaskId,
      error: message,
    });

    if (record) {
      record.status = 'failed';
      record.failureReason = message;
      await updateUsageCounters(record);
      await record.save().catch((saveError) => {
        fullAuditLogger.warn('Failed to persist full-audit failure state.', {
          taskId: effectiveTaskId,
          error: saveError instanceof Error ? saveError.message : String(saveError),
        });
      });
    }

    throw error instanceof Error ? error : new Error(message);
  } finally {
    await fs.rm(jobFolder, { recursive: true, force: true }).catch(() => undefined);
  }
}
