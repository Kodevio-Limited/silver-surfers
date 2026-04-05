import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

import '../../config/env.ts';
import { logger } from '../../config/logger.ts';
import type { QueueReportStorage, QueueStoredObject } from '../../infrastructure/queues/job-queue.ts';
import {
  buildS3Uri,
  isS3Configured,
  uploadFilesToS3,
} from '../storage/report-storage.ts';

const reportDeliveryLogger = logger.child('feature:audits:report-delivery');
let cachedTransporter: nodemailer.Transporter | null = null;
const S3_EXPIRY_DAYS = Math.max(
  1,
  Math.round((Number(process.env.AWS_S3_SIGNED_URL_EXPIRES_SECONDS) || (7 * 24 * 60 * 60)) / 86400),
);

export interface ReportAttachment {
  filename: string;
  path: string;
  size: number;
  sizeMB: string;
}

export interface UploadedReportFile {
  filename: string;
  size?: number;
  sizeMB?: string;
  downloadUrl: string;
  providerUrl?: string;
  key?: string;
}

interface StorageUploadResult {
  providerLabel: string;
  linksExpire: boolean;
  storage: QueueReportStorage;
  uploadedFiles: UploadedReportFile[];
  storageErrors?: string[];
}

export interface AuditReportEmailOptions {
  to: string;
  subject: string;
  text: string;
  folderPath: string;
  isQuickScan?: boolean;
  websiteUrl?: string;
  quickScanScore?: string | number | null;
  deviceFilter?: string | null;
}

export interface AuditReportEmailResult {
  success?: boolean;
  error?: string;
  attachmentCount?: number;
  uploadedCount?: number;
  totalFiles?: number;
  totalSizeMB?: string;
  uploadedFiles?: string[];
  storage?: QueueReportStorage;
  storageErrors?: string[];
  accepted?: string[];
  rejected?: string[];
  response?: string;
  messageId?: string;
}

export interface DirectMailAttachment {
  filename: string;
  path: string;
  contentType?: string;
}

export interface DirectMailOptions {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: DirectMailAttachment[];
}

interface MailTransportResult {
  transporter: nodemailer.Transporter | null;
  reason?: string;
}

function buildTransport(): MailTransportResult {
  if (cachedTransporter) {
    return { transporter: cachedTransporter };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = typeof process.env.SMTP_SECURE === 'string'
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    return { transporter: null, reason: 'SMTP not configured (missing SMTP_HOST)' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 20_000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10_000,
    ...(process.env.SMTP_IGNORE_TLS_ERRORS === 'true' ? { tls: { rejectUnauthorized: false } } : {}),
  });

  cachedTransporter = transporter;
  return { transporter };
}

function normalizeAddressList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value));
}

async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    reportDeliveryLogger.warn('Failed to read file size.', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

function buildStorageUnavailableResult(files: ReportAttachment[]): StorageUploadResult {
  const storageErrors = files.length > 0
    ? ['Cloud report storage is not configured. Set AWS_S3_BUCKET and AWS_REGION to deliver report download links.']
    : [];

  return {
    providerLabel: 'Storage unavailable',
    linksExpire: false,
    storage: {
      provider: 'unconfigured',
      objectCount: 0,
      objects: [],
    },
    uploadedFiles: [],
    storageErrors,
  };
}

async function uploadFilesToConfiguredStorage(
  files: ReportAttachment[],
  options: {
    folderPath: string;
    recipientEmail: string;
    kind: string;
  },
): Promise<StorageUploadResult> {
  if (!isS3Configured()) {
    reportDeliveryLogger.warn('Report delivery storage is not configured for upload.', {
      kind: options.kind,
      folderPath: options.folderPath,
      fileCount: files.length,
    });
    return buildStorageUnavailableResult(files);
  }

  const result = await uploadFilesToS3(files, {
    folderPath: options.folderPath,
    recipientEmail: options.recipientEmail,
    kind: options.kind,
  });

  return {
    providerLabel: 'AWS S3',
    linksExpire: result.urlMode === 'signed',
    storage: {
      provider: result.provider,
      bucket: result.bucket,
      region: result.region,
      prefix: result.prefix,
      objectCount: result.objectCount,
      signedUrlExpiresInSeconds: result.signedUrlExpiresInSeconds,
      objects: result.uploadedFiles.map((file): QueueStoredObject => ({
        filename: file.filename,
        size: file.size,
        sizeMB: file.sizeMB,
        key: file.key,
        providerUrl: file.downloadUrl,
      })),
    },
    uploadedFiles: result.uploadedFiles.map((file) => ({
      filename: file.filename,
      size: file.size,
      sizeMB: file.sizeMB,
      downloadUrl: file.downloadUrl,
      providerUrl: file.providerUrl,
      key: file.key,
    })),
  };
}

function matchesDeviceFilter(filePath: string, deviceFilter?: string | null): boolean {
  if (!deviceFilter) {
    return true;
  }

  const deviceRegex = new RegExp(`[-_]${deviceFilter}([-.]|$)`);
  return deviceRegex.test(filePath);
}

export async function collectAttachmentsRecursive(
  rootDir: string,
  deviceFilter: string | null = null,
): Promise<ReportAttachment[]> {
  const results: ReportAttachment[] = [];

  async function walk(currentDirectory: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      reportDeliveryLogger.warn('Cannot read directory while collecting attachments.', {
        currentDirectory,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const lowerPath = fullPath.toLowerCase();
      const isSupportedAttachment = lowerPath.endsWith('.pdf');
      if (!entry.isFile() || !isSupportedAttachment) {
        continue;
      }

      if (!matchesDeviceFilter(fullPath, deviceFilter)) {
        continue;
      }

      try {
        await fs.access(fullPath);
        const size = await getFileSize(fullPath);
        results.push({
          filename: path.relative(rootDir, fullPath),
          path: fullPath,
          size,
          sizeMB: (size / (1024 * 1024)).toFixed(2),
        });
      } catch (error) {
        reportDeliveryLogger.warn('Skipping inaccessible report attachment.', {
          filePath: fullPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  try {
    await walk(rootDir);
  } catch (error) {
    reportDeliveryLogger.warn('Attachment collection failed.', {
      rootDir,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

function formatQuickScanDisplayName(fileName: string, quickScanScore: string | number | null | undefined): string {
  const baseName = path.basename(fileName);
  if (!baseName.endsWith('.pdf')) {
    return baseName;
  }

  const parsedScore = Number.parseFloat(String(quickScanScore ?? ''));
  const scoreText = Number.isFinite(parsedScore) ? ` (${Math.round(parsedScore)}%)` : '';
  return `Website Results for: ${baseName}${scoreText}`;
}

export function buildAuditReportEmailBody(options: {
  baseText: string;
  uploadedFiles: UploadedReportFile[];
  storage: QueueReportStorage | undefined;
  storageErrors?: string[];
  isQuickScan?: boolean;
  quickScanScore?: string | number | null;
}): string {
  let emailBody = options.baseText;

  if (options.uploadedFiles.length > 0) {
    emailBody += '\n\n📁 DOWNLOAD LINKS FOR YOUR FILES:\n';
    emailBody += 'Your audit reports have been uploaded to secure cloud storage:\n\n';

    for (const file of options.uploadedFiles) {
      const displayName = options.isQuickScan
        ? formatQuickScanDisplayName(file.filename, options.quickScanScore)
        : path.basename(file.filename);

      emailBody += `• ${displayName}\n`;
      emailBody += `  Download: ${file.downloadUrl}\n\n`;
    }

    if (options.storage?.provider === 's3' && usesSignedS3Urls()) {
      emailBody += `⚠️ Note: Download links expire in ${S3_EXPIRY_DAYS} day${S3_EXPIRY_DAYS === 1 ? '' : 's'} for security.\n`;
      emailBody += 'Please download your files promptly and keep them safe.\n\n';
    } else {
      emailBody += 'These links are hosted in your cloud report archive for later retrieval.\n\n';
    }
  }

  if (options.storageErrors && options.storageErrors.length > 0) {
    emailBody += '\n❌ SOME FILES COULD NOT BE UPLOADED:\n';
    for (const error of options.storageErrors) {
      emailBody += `• ${error}\n`;
    }
    emailBody += '\nPlease contact support if you need these files.\n';
  }

  return emailBody;
}

function buildFromAddress(): string {
  return `SilverSurfers <${process.env.SMTP_USER || 'no-reply@silversurfers.local'}>`;
}

function usesSignedS3Urls(): boolean {
  return process.env.AWS_S3_URL_MODE?.trim() === 'signed';
}

export async function sendAuditReportEmail(options: AuditReportEmailOptions): Promise<AuditReportEmailResult> {
  const { transporter, reason } = buildTransport();
  if (!transporter) {
    reportDeliveryLogger.warn('Audit report email skipped.', {
      reason,
      to: options.to,
      subject: options.subject,
    });
    return { success: false, error: reason };
  }

  const files = options.folderPath
    ? await collectAttachmentsRecursive(options.folderPath, options.deviceFilter || null)
    : [];
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  reportDeliveryLogger.info('Preparing audit report email.', {
    to: options.to,
    subject: options.subject,
    folderPath: options.folderPath,
    fileCount: files.length,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    provider: isS3Configured() ? 's3' : 'unconfigured',
  });

  let uploadResult: StorageUploadResult | undefined;
  const storageErrors: string[] = [];

  try {
    uploadResult = await uploadFilesToConfiguredStorage(files, {
      folderPath: options.folderPath,
      recipientEmail: options.to,
      kind: options.isQuickScan ? 'quick-scans' : 'audit-reports',
    });

    if (uploadResult.storage.provider === 's3' && uploadResult.storage.bucket && uploadResult.storage.prefix) {
      reportDeliveryLogger.info('Uploaded report files to S3.', {
        to: options.to,
        s3Uri: buildS3Uri(uploadResult.storage.bucket, uploadResult.storage.prefix),
      });
    }
  } catch (error) {
    storageErrors.push(error instanceof Error ? error.message : String(error));
    reportDeliveryLogger.error('Audit report storage upload failed.', {
      to: options.to,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const combinedStorageErrors = [
    ...(uploadResult?.storageErrors || []),
    ...storageErrors,
  ];
  const emailBody = buildAuditReportEmailBody({
    baseText: options.text,
    uploadedFiles: uploadResult?.uploadedFiles || [],
    storage: uploadResult?.storage,
    storageErrors: combinedStorageErrors,
    isQuickScan: options.isQuickScan,
    quickScanScore: options.quickScanScore,
  });

  try {
    // await transporter.verify();
    const info = await transporter.sendMail({
      from: buildFromAddress(),
      to: options.to,
      subject: options.subject,
      text: emailBody,
    });

    return {
      success: true,
      attachmentCount: uploadResult?.uploadedFiles.length || 0,
      uploadedCount: uploadResult?.uploadedFiles.length || 0,
      totalFiles: files.length,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      uploadedFiles: (uploadResult?.uploadedFiles || []).map((file) => file.filename),
      storage: uploadResult?.storage,
      storageErrors: combinedStorageErrors.length > 0 ? combinedStorageErrors : undefined,
      accepted: normalizeAddressList(info.accepted),
      rejected: normalizeAddressList(info.rejected),
      response: info.response,
      messageId: info.messageId,
    };
  } catch (error) {
    reportDeliveryLogger.error('Audit report email send failed.', {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendDirectMail(options: DirectMailOptions): Promise<{
  success: boolean;
  error?: string;
  accepted?: string[];
  rejected?: string[];
  response?: string;
  messageId?: string;
}> {
  const { transporter, reason } = buildTransport();
  if (!transporter) {
    return {
      success: false,
      error: reason,
    };
  }

  try {
    // await transporter.verify();
    const info = await transporter.sendMail({
      from: options.from || buildFromAddress(),
      to: options.to,
      subject: options.subject,
      ...(options.html ? { html: options.html } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.attachments?.length ? { attachments: options.attachments } : {}),
    });

    return {
      success: true,
      accepted: normalizeAddressList(info.accepted),
      rejected: normalizeAddressList(info.rejected),
      response: info.response,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
