import { resolveBackendPath } from '../../config/paths.ts';
import type { QueueReportStorage } from '../../infrastructure/queues/job-queue.ts';

export const FULL_AUDIT_VALID_DEVICES = ['desktop', 'mobile', 'tablet'] as const;

export type FullAuditDevice = typeof FULL_AUDIT_VALID_DEVICES[number];
export type FullAuditScannerMode = 'full' | 'lite';

export interface FullAuditEmailResult {
  success?: boolean;
  error?: string;
  accepted?: string[];
  rejected?: string[];
  attachmentCount?: number;
  uploadedCount?: number;
  totalFiles?: number;
  storageErrors?: string[];
  storage?: QueueReportStorage;
}

export interface FullAuditMutableRecord {
  emailStatus?: string;
  emailAccepted?: string[];
  emailRejected?: string[];
  attachmentCount?: number;
  reportDirectory?: string;
  reportStorage?: QueueReportStorage;
  emailError?: string;
  status?: string;
  failureReason?: string;
}

export interface FullAuditEmailContent {
  subject: string;
  text: string;
  deviceFilter: FullAuditDevice | null;
}

export function sanitizePathSegment(value: string, maxLength?: number): string {
  const sanitized = value.replace(/[^a-z0-9]/gi, '_');
  const trimmed = maxLength ? sanitized.slice(0, maxLength) : sanitized;
  return trimmed || 'audit';
}

export function resolveDevicesToAudit(planId: string, selectedDevice?: string | null): FullAuditDevice[] {
  if (selectedDevice && !FULL_AUDIT_VALID_DEVICES.includes(selectedDevice as FullAuditDevice)) {
    throw new Error(`Invalid device selection: ${selectedDevice}. Must be one of: ${FULL_AUDIT_VALID_DEVICES.join(', ')}`);
  }

  if (planId === 'pro') {
    return [...FULL_AUDIT_VALID_DEVICES];
  }

  if (planId === 'oneTime') {
    if (!selectedDevice) {
      throw new Error('Device selection is required for one-time scans. Please select desktop, mobile, or tablet.');
    }

    return [selectedDevice as FullAuditDevice];
  }

  return [selectedDevice ? selectedDevice as FullAuditDevice : 'desktop'];
}

export function buildFullAuditEmailContent(
  planId: string,
  selectedDevice?: string | null,
): FullAuditEmailContent {
  if (planId === 'starter') {
    return {
      subject: 'Your SilverSurfers Starter Audit Results',
      text: 'Attached are all of the older adult accessibility audit results for your Starter Subscription. Thank you for using SilverSurfers!',
      deviceFilter: (selectedDevice as FullAuditDevice | undefined) || 'desktop',
    };
  }

  if (planId === 'pro') {
    return {
      subject: 'Your SilverSurfers Pro Audit Results',
      text: 'Attached are all of the older adult accessibility audit results for your Pro Subscription. Thank you for using SilverSurfers!',
      deviceFilter: null,
    };
  }

  if (planId === 'oneTime') {
    return {
      subject: 'Your SilverSurfers One-Time Report Results',
      text: 'Attached are all of the older adult accessibility audit results for your One-Time Report. Thank you for using SilverSurfers!',
      deviceFilter: (selectedDevice as FullAuditDevice | undefined) || 'desktop',
    };
  }

  return {
    subject: 'Your SilverSurfers Audit Results',
    text: 'Attached are all your senior accessibility audit results. Thank you for using SilverSurfers!',
    deviceFilter: (selectedDevice as FullAuditDevice | undefined) || 'desktop',
  };
}

export function buildFullAuditReportDirectory(
  reportStorage: QueueReportStorage | undefined,
  fallback: string,
): string {
  if (reportStorage?.provider === 's3' && reportStorage.bucket && reportStorage.prefix) {
    return `s3://${reportStorage.bucket}/${reportStorage.prefix}`;
  }

  return fallback;
}

export function applyFullAuditEmailResult(
  record: FullAuditMutableRecord,
  sendResult: FullAuditEmailResult,
  fallbackReportDirectory: string,
): void {
  if (sendResult.success) {
    record.emailStatus = 'sent';
    record.emailAccepted = sendResult.accepted || [];
    record.emailRejected = sendResult.rejected || [];

    if (typeof sendResult.attachmentCount === 'number') {
      record.attachmentCount = Math.max(Number(record.attachmentCount || 0), sendResult.attachmentCount);
    }

    const hasStoredObjects = Array.isArray(sendResult.storage?.objects) && sendResult.storage.objects.length > 0;
    if (sendResult.storage) {
      record.reportStorage = sendResult.storage;
      record.reportDirectory = hasStoredObjects
        ? buildFullAuditReportDirectory(sendResult.storage, fallbackReportDirectory)
        : fallbackReportDirectory;
    } else {
      record.reportDirectory = fallbackReportDirectory;
    }

    return;
  }

  record.emailStatus = 'failed';
  record.emailError = sendResult.error || 'Unknown send error';
}

export function finalizeFullAuditRecord(
  record: FullAuditMutableRecord,
  sendResult?: FullAuditEmailResult,
): void {
  if (record.emailStatus === 'failed') {
    record.status = 'failed';
    record.failureReason = record.failureReason || `Email send failed: ${record.emailError || 'Unknown error'}`;
    return;
  }

  if (!record.attachmentCount || record.attachmentCount === 0) {
    const localFileCount = sendResult?.totalFiles || 0;
    const actualUploadedCount = sendResult?.uploadedCount || 0;
    const storageErrors = (sendResult?.storageErrors || []).filter(Boolean);

    if (localFileCount > 0) {
      record.attachmentCount = localFileCount;
      record.status = 'completed';
      if (storageErrors.length > 0) {
        record.emailError = storageErrors.join(' | ');
      }
      if (record.failureReason && record.failureReason.includes('watchdog timeout')) {
        record.failureReason = undefined;
      }
      return;
    }

    if (actualUploadedCount === 0) {
      record.status = 'failed';
      record.failureReason = record.failureReason
        || (storageErrors.length > 0
          ? `No reports were available after storage upload failed: ${storageErrors.join(' | ')}`
          : 'No reports generated (0 files uploaded).');
      return;
    }

    record.attachmentCount = actualUploadedCount;
  }

  record.status = 'completed';
  if (record.failureReason && record.failureReason.includes('watchdog timeout')) {
    record.failureReason = undefined;
  }
}

function sanitizeSealSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9@.-]/g, '_').replace(/https?:\/\//, '').replace(/\./g, '-');
}

export function buildSealResultsFilePath(email: string, url: string): string {
  const baseUrl = (() => {
    try {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const parsedUrl = new URL(normalizedUrl);
      return `${parsedUrl.protocol}//${parsedUrl.hostname.replace(/^www\./, '')}`;
    } catch {
      return url.replace(/^www\./, '');
    }
  })();

  const directoryName = `${sanitizeSealSegment(email)}_${sanitizeSealSegment(baseUrl)}`;
  return resolveBackendPath(
    'storage/seal-reports',
    directoryName,
    'results.json',
  );
}
