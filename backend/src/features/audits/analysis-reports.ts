import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Response } from 'express';

import type { AnalysisRecordDocument, QuickScanDocument } from './audits.dependencies.ts';
import { collectAttachmentsRecursive } from './report-delivery.ts';
import {
  buildAnalysisReportFileViews,
  buildStoredReportFilesFromAttachments,
  buildStoredReportFilesFromStorage,
  normalizeStoredReportFiles,
  type AnalysisReportFileView,
  type StoredReportFile,
} from './report-files.ts';
import { downloadS3Object } from '../storage/report-storage.ts';

type ReportOwnerRecord = AnalysisRecordDocument | QuickScanDocument;

function isS3Directory(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('s3://');
}

function getSafeLocalReportRoot(value: string | undefined): string | null {
  if (!value || isS3Directory(value)) {
    return null;
  }

  return path.resolve(value);
}

function resolvePersistedReportFiles(record: ReportOwnerRecord): StoredReportFile[] {
  const normalized = normalizeStoredReportFiles(record.reportFiles);
  if (normalized.length > 0) {
    return normalized;
  }

  const storageBackfill = buildStoredReportFilesFromStorage(record.reportStorage);
  if (storageBackfill.length > 0) {
    return storageBackfill;
  }

  return [];
}

export async function hydrateAnalysisReportFiles(record: ReportOwnerRecord): Promise<StoredReportFile[]> {
  const persistedFiles = resolvePersistedReportFiles(record);
  if (persistedFiles.length > 0) {
    if (!record.reportFiles || record.reportFiles.length !== persistedFiles.length) {
      record.reportFiles = persistedFiles;
      await record.save().catch(() => undefined);
    }

    return persistedFiles;
  }

  const localRoot = getSafeLocalReportRoot(record.reportDirectory);
  if (!localRoot) {
    return [];
  }

  const attachments = await collectAttachmentsRecursive(localRoot).catch(() => []);
  const builtFiles = buildStoredReportFilesFromAttachments(attachments);
  if (builtFiles.length > 0) {
    record.reportFiles = builtFiles;
    record.attachmentCount = builtFiles.length;
    await record.save().catch(() => undefined);
  }

  return builtFiles;
}

export async function listAnalysisReportFiles(record: ReportOwnerRecord): Promise<AnalysisReportFileView[]> {
  const files = await hydrateAnalysisReportFiles(record);
  return buildAnalysisReportFileViews(files);
}

function resolveLocalReportFilePath(record: ReportOwnerRecord, file: StoredReportFile): string | null {
  const localRoot = getSafeLocalReportRoot(record.reportDirectory);
  if (!localRoot) {
    return null;
  }

  const relativePath = file.relativePath || file.filename;
  if (!relativePath) {
    return null;
  }

  const resolvedPath = path.resolve(localRoot, relativePath);
  const relative = path.relative(localRoot, resolvedPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return resolvedPath;
}

function buildContentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const safeFileName = filename.replace(/["\r\n]/g, '_');
  return `${disposition}; filename="${safeFileName}"`;
}

export async function sendAnalysisReportFile(
  record: ReportOwnerRecord,
  reportId: string,
  response: Response,
  disposition: 'inline' | 'attachment' = 'attachment',
): Promise<boolean> {
  const files = await hydrateAnalysisReportFiles(record);
  const file = files.find((entry) => entry.id === reportId);
  if (!file) {
    return false;
  }

  if (
    record.reportStorage?.provider === 's3'
    && record.reportStorage.bucket
    && record.reportStorage.region
    && file.storageKey
  ) {
    const s3Object = await downloadS3Object({
      bucket: record.reportStorage.bucket,
      region: record.reportStorage.region,
      key: file.storageKey,
    });

    response.setHeader('Content-Type', file.contentType || s3Object.contentType || 'application/octet-stream');
    response.setHeader('Content-Disposition', buildContentDisposition(disposition, path.basename(file.filename)));
    if (s3Object.contentLength !== undefined) {
      response.setHeader('Content-Length', String(s3Object.contentLength));
    }
    response.send(s3Object.body);
    return true;
  }

  if (file.providerUrl) {
    response.redirect(302, file.providerUrl);
    return true;
  }

  const localFilePath = resolveLocalReportFilePath(record, file);
  if (!localFilePath) {
    return false;
  }

  await fs.access(localFilePath);
  response.setHeader('Content-Type', file.contentType || 'application/octet-stream');
  response.setHeader('Content-Disposition', buildContentDisposition(disposition, path.basename(file.filename)));

  await new Promise<void>((resolve, reject) => {
    const stream = fsSync.createReadStream(localFilePath);
    stream.on('error', reject);
    response.on('finish', () => resolve());
    response.on('close', () => resolve());
    stream.pipe(response);
  });

  return true;
}
