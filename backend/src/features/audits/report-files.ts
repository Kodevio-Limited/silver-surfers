import crypto from 'node:crypto';
import path from 'node:path';

import type { QueueReportStorage, QueueStoredObject } from '../../infrastructure/queues/job-queue.ts';
import type { ReportAttachment } from './report-delivery.ts';

export interface StoredReportFile {
  id: string;
  filename: string;
  relativePath?: string;
  storageKey?: string;
  providerUrl?: string;
  size?: number;
  sizeMB?: string;
  contentType: string;
}

export interface AnalysisReportFileView {
  id: string;
  filename: string;
  displayName: string;
  contentType: string;
  size?: number;
  sizeMB?: string;
  hasPreview: boolean;
  hasDownload: boolean;
}

function createReportFileId(seed: string): string {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 20);
}

function getContentType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

function buildStoredReportFile(options: {
  filename: string;
  relativePath?: string;
  storageKey?: string;
  providerUrl?: string;
  size?: number;
  sizeMB?: string;
  contentType?: string;
}): StoredReportFile {
  const identity = options.relativePath || options.storageKey || options.filename;

  return {
    id: createReportFileId(identity),
    filename: options.filename,
    ...(options.relativePath ? { relativePath: options.relativePath } : {}),
    ...(options.storageKey ? { storageKey: options.storageKey } : {}),
    ...(options.providerUrl ? { providerUrl: options.providerUrl } : {}),
    ...(options.size !== undefined ? { size: options.size } : {}),
    ...(options.sizeMB !== undefined ? { sizeMB: options.sizeMB } : {}),
    contentType: options.contentType || getContentType(options.filename),
  };
}

export function buildStoredReportFilesFromAttachments(attachments: ReportAttachment[]): StoredReportFile[] {
  return attachments.map((attachment) => buildStoredReportFile({
    filename: attachment.filename,
    relativePath: attachment.filename,
    size: attachment.size,
    sizeMB: attachment.sizeMB,
    contentType: getContentType(attachment.filename),
  }));
}

export function buildStoredReportFilesFromStorage(storage: QueueReportStorage | undefined): StoredReportFile[] {
  return (storage?.objects || []).map((object) => buildStoredReportFile({
    filename: object.filename,
    storageKey: object.key,
    providerUrl: object.providerUrl,
    size: object.size,
    sizeMB: object.sizeMB,
  }));
}

export function mergeStoredReportFilesWithStorage(
  reportFiles: StoredReportFile[],
  storage: QueueReportStorage | undefined,
): StoredReportFile[] {
  if (!storage?.objects?.length) {
    return reportFiles;
  }

  const objectsByFilename = new Map<string, QueueStoredObject>();
  for (const object of storage.objects) {
    if (object.filename) {
      objectsByFilename.set(object.filename, object);
    }
  }

  const mergedFiles = reportFiles.map((file) => {
    const matchedObject = objectsByFilename.get(file.filename);
    if (!matchedObject) {
      return file;
    }

    return {
      ...file,
      ...(matchedObject.key ? { storageKey: matchedObject.key } : {}),
      ...(matchedObject.providerUrl ? { providerUrl: matchedObject.providerUrl } : {}),
      ...(matchedObject.size !== undefined ? { size: matchedObject.size } : {}),
      ...(matchedObject.sizeMB !== undefined ? { sizeMB: matchedObject.sizeMB } : {}),
    };
  });

  for (const object of storage.objects) {
    const alreadyExists = mergedFiles.some((file) => file.filename === object.filename);
    if (alreadyExists) {
      continue;
    }

    mergedFiles.push(buildStoredReportFile({
      filename: object.filename,
      storageKey: object.key,
      providerUrl: object.providerUrl,
      size: object.size,
      sizeMB: object.sizeMB,
    }));
  }

  return mergedFiles;
}

export function normalizeStoredReportFiles(
  reportFiles: Array<StoredReportFile | Record<string, unknown>> | undefined,
): StoredReportFile[] {
  if (!Array.isArray(reportFiles)) {
    return [];
  }

  return reportFiles
    .map((file) => {
      const filename = String(file.filename || '').trim();
      if (!filename) {
        return null;
      }

      return buildStoredReportFile({
        filename,
        relativePath: typeof file.relativePath === 'string' ? file.relativePath : undefined,
        storageKey: typeof file.storageKey === 'string' ? file.storageKey : undefined,
        providerUrl: typeof file.providerUrl === 'string' ? file.providerUrl : undefined,
        size: typeof file.size === 'number' ? file.size : undefined,
        sizeMB: typeof file.sizeMB === 'string' ? file.sizeMB : undefined,
        contentType: typeof file.contentType === 'string' ? file.contentType : undefined,
      });
    })
    .filter((file): file is StoredReportFile => Boolean(file));
}

export function buildAnalysisReportFileViews(reportFiles: StoredReportFile[]): AnalysisReportFileView[] {
  return reportFiles.map((file) => ({
    id: file.id,
    filename: file.filename,
    displayName: path.basename(file.filename),
    contentType: file.contentType,
    ...(file.size !== undefined ? { size: file.size } : {}),
    ...(file.sizeMB !== undefined ? { sizeMB: file.sizeMB } : {}),
    hasPreview: file.contentType === 'application/pdf',
    hasDownload: true,
  }));
}
