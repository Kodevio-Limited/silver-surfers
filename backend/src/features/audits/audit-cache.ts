import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

import Redis from 'ioredis';

import { env } from '../../config/env.ts';
import { logger } from '../../config/logger.ts';
import type { FullAuditDevice } from './full-audit.helpers.ts';
import type { AuditAiReport } from './ai-reporting.ts';
import type { AuditScorecard } from './audit-scorecard.ts';
import type { StoredReportFile } from './report-files.ts';
import type { QueueReportStorage } from '../../infrastructure/queues/job-queue.ts';

const auditCacheLogger = logger.child('feature:audits:audit-cache');
const CACHE_VERSION = 2;

interface StoredCachedFullAuditPageReport {
  version: number;
  websiteUrl: string;
  pageUrl: string;
  device: FullAuditDevice;
  isLiteVersion: boolean;
  cachedAt: string;
  reportGzipBase64: string;
}

export interface CachedFullAuditPageReport {
  websiteUrl: string;
  pageUrl: string;
  device: FullAuditDevice;
  isLiteVersion: boolean;
  cachedAt: string;
  report: Record<string, unknown>;
}

export interface CachedCompletedFullAuditSnapshot {
  websiteUrl: string;
  planId: string;
  selectedDevice?: string | null;
  totalPageLimit: number;
  priorityPageLimit: number;
  fullModePageLimit: number;
  status: 'completed' | 'completed_with_warnings';
  cachedAt: string;
  sourceTaskId?: string;
  score?: number | null;
  scoreCard?: AuditScorecard;
  aiReport?: AuditAiReport;
  warnings: string[];
  plannedTargetCount: number;
  successfulTargetCount: number;
  degradedTargetCount: number;
  failedTargetCount: number;
  scanTargets: Array<Record<string, unknown>>;
  attachmentCount: number;
  reportDirectory?: string;
  reportStorage?: QueueReportStorage;
  reportFiles: StoredReportFile[];
}

interface StoredCachedCompletedFullAuditSnapshot {
  version: number;
  cachedAt: string;
  snapshotGzipBase64: string;
}

let cachedRedisClient: Redis | null = null;
let cachedRedisConnection: Promise<Redis | null> | null = null;

function sha1(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex');
}

export function normalizeWebsiteCacheUrl(input: string): string {
  try {
    const parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return String(input || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]?.toLowerCase() || 'site';
  }
}

export function normalizePageCacheUrl(input: string): string {
  try {
    const parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const normalizedPath = parsed.pathname.replace(/\/+$/, '') || '/';
    return `https://${hostname}${normalizedPath}`;
  } catch {
    return String(input || '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '') || input;
  }
}

export function buildFullAuditPageCacheKey(
  websiteUrl: string,
  pageUrl: string,
  device: FullAuditDevice,
): string {
  const websiteKey = normalizeWebsiteCacheUrl(websiteUrl);
  const pageKey = normalizePageCacheUrl(pageUrl);
  return `${env.bullMqPrefix}:full-audit:page-cache:v${CACHE_VERSION}:${device}:${sha1(`${websiteKey}|${pageKey}`)}`;
}

export function buildFullAuditReuseCacheKey(options: {
  websiteUrl: string;
  planId: string;
  selectedDevice?: string | null;
  totalPageLimit: number;
  priorityPageLimit: number;
  fullModePageLimit: number;
}): string {
  const websiteKey = normalizeWebsiteCacheUrl(options.websiteUrl);
  const scopeKey = [
    options.planId || 'starter',
    options.selectedDevice || 'all-devices',
    String(options.totalPageLimit),
    String(options.priorityPageLimit),
    String(options.fullModePageLimit),
  ].join('|');

  return `${env.bullMqPrefix}:full-audit:reuse-cache:v${CACHE_VERSION}:${sha1(`${websiteKey}|${scopeKey}`)}`;
}

export function encodeCachedFullAuditPageReport(input: {
  websiteUrl: string;
  pageUrl: string;
  device: FullAuditDevice;
  isLiteVersion: boolean;
  cachedAt?: string;
  report: Record<string, unknown>;
}): string {
  const payload: StoredCachedFullAuditPageReport = {
    version: CACHE_VERSION,
    websiteUrl: normalizeWebsiteCacheUrl(input.websiteUrl),
    pageUrl: normalizePageCacheUrl(input.pageUrl),
    device: input.device,
    isLiteVersion: Boolean(input.isLiteVersion),
    cachedAt: input.cachedAt || new Date().toISOString(),
    reportGzipBase64: gzipSync(Buffer.from(JSON.stringify(input.report), 'utf8')).toString('base64'),
  };

  return JSON.stringify(payload);
}

export function decodeCachedFullAuditPageReport(raw: string): CachedFullAuditPageReport | null {
  try {
    const parsed = JSON.parse(raw) as StoredCachedFullAuditPageReport;
    if (parsed.version !== CACHE_VERSION || !parsed.reportGzipBase64) {
      return null;
    }

    const report = JSON.parse(gunzipSync(Buffer.from(parsed.reportGzipBase64, 'base64')).toString('utf8')) as Record<string, unknown>;
    return {
      websiteUrl: parsed.websiteUrl,
      pageUrl: parsed.pageUrl,
      device: parsed.device,
      isLiteVersion: parsed.isLiteVersion,
      cachedAt: parsed.cachedAt,
      report,
    };
  } catch {
    return null;
  }
}

export function encodeCachedCompletedFullAuditSnapshot(snapshot: CachedCompletedFullAuditSnapshot): string {
  const storedPayload: StoredCachedCompletedFullAuditSnapshot = {
    version: CACHE_VERSION,
    cachedAt: snapshot.cachedAt,
    snapshotGzipBase64: gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf8')).toString('base64'),
  };

  return JSON.stringify(storedPayload);
}

export function decodeCachedCompletedFullAuditSnapshot(raw: string): CachedCompletedFullAuditSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as StoredCachedCompletedFullAuditSnapshot;
    if (parsed.version !== CACHE_VERSION || !parsed.snapshotGzipBase64) {
      return null;
    }

    return JSON.parse(gunzipSync(Buffer.from(parsed.snapshotGzipBase64, 'base64')).toString('utf8')) as CachedCompletedFullAuditSnapshot;
  } catch {
    return null;
  }
}

function buildTempReportPath(pageUrl: string, isLiteVersion: boolean): string {
  let hostname = 'report';
  try {
    hostname = new URL(pageUrl).hostname.replace(/^www\./i, '').replace(/\./g, '-').toLowerCase() || 'report';
  } catch {
    hostname = String(pageUrl || 'report').replace(/[^a-z0-9.-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'report';
  }

  return path.join(os.tmpdir(), `report-${hostname}-${Date.now()}${isLiteVersion ? '-lite' : ''}.json`);
}

async function getRedisClient(): Promise<Redis | null> {
  if (!env.redisUrl) {
    return null;
  }

  if (cachedRedisClient && cachedRedisClient.status !== 'end') {
    return cachedRedisClient;
  }

  if (cachedRedisConnection) {
    return cachedRedisConnection;
  }

  cachedRedisConnection = (async () => {
    const client = new Redis(env.redisUrl!, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
    });

    try {
      await client.connect();
      cachedRedisClient = client;
      return client;
    } catch (error) {
      auditCacheLogger.warn('Failed to connect to Redis-backed audit cache.', {
        error: error instanceof Error ? error.message : String(error),
      });
      client.disconnect();
      return null;
    } finally {
      cachedRedisConnection = null;
    }
  })();

  return cachedRedisConnection;
}

export async function getCachedFullAuditPageReport(options: {
  websiteUrl: string;
  pageUrl: string;
  device: FullAuditDevice;
}): Promise<CachedFullAuditPageReport | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const raw = await client.get(buildFullAuditPageCacheKey(options.websiteUrl, options.pageUrl, options.device));
    if (!raw) {
      return null;
    }

    return decodeCachedFullAuditPageReport(raw);
  } catch (error) {
    auditCacheLogger.warn('Failed to read page audit report from Redis cache.', {
      websiteUrl: normalizeWebsiteCacheUrl(options.websiteUrl),
      pageUrl: normalizePageCacheUrl(options.pageUrl),
      device: options.device,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedFullAuditPageReport(options: {
  websiteUrl: string;
  pageUrl: string;
  device: FullAuditDevice;
  isLiteVersion: boolean;
  report: Record<string, unknown>;
}): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.set(
      buildFullAuditPageCacheKey(options.websiteUrl, options.pageUrl, options.device),
      encodeCachedFullAuditPageReport(options),
      'PX',
      env.fullAuditCacheTtlMs,
    );
  } catch (error) {
    auditCacheLogger.warn('Failed to store page audit report in Redis cache.', {
      websiteUrl: normalizeWebsiteCacheUrl(options.websiteUrl),
      pageUrl: normalizePageCacheUrl(options.pageUrl),
      device: options.device,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getCachedCompletedFullAuditSnapshot(options: {
  websiteUrl: string;
  planId: string;
  selectedDevice?: string | null;
  totalPageLimit: number;
  priorityPageLimit: number;
  fullModePageLimit: number;
}): Promise<CachedCompletedFullAuditSnapshot | null> {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const raw = await client.get(buildFullAuditReuseCacheKey(options));
    if (!raw) {
      return null;
    }

    return decodeCachedCompletedFullAuditSnapshot(raw);
  } catch (error) {
    auditCacheLogger.warn('Failed to read reusable completed audit snapshot from Redis cache.', {
      websiteUrl: normalizeWebsiteCacheUrl(options.websiteUrl),
      planId: options.planId,
      selectedDevice: options.selectedDevice || 'all-devices',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedCompletedFullAuditSnapshot(
  snapshot: CachedCompletedFullAuditSnapshot,
): Promise<void> {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  try {
    await client.set(
      buildFullAuditReuseCacheKey({
        websiteUrl: snapshot.websiteUrl,
        planId: snapshot.planId,
        selectedDevice: snapshot.selectedDevice,
        totalPageLimit: snapshot.totalPageLimit,
        priorityPageLimit: snapshot.priorityPageLimit,
        fullModePageLimit: snapshot.fullModePageLimit,
      }),
      encodeCachedCompletedFullAuditSnapshot(snapshot),
      'PX',
      env.fullAuditCacheTtlMs,
    );
  } catch (error) {
    auditCacheLogger.warn('Failed to store reusable completed audit snapshot in Redis cache.', {
      websiteUrl: normalizeWebsiteCacheUrl(snapshot.websiteUrl),
      planId: snapshot.planId,
      selectedDevice: snapshot.selectedDevice || 'all-devices',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function materializeCachedFullAuditPageReport(
  cachedReport: CachedFullAuditPageReport,
): Promise<string> {
  const tempPath = buildTempReportPath(cachedReport.pageUrl, cachedReport.isLiteVersion);
  await fs.writeFile(tempPath, JSON.stringify(cachedReport.report), 'utf8');
  return tempPath;
}

export async function closeAuditCache(): Promise<void> {
  const client = cachedRedisClient;
  cachedRedisClient = null;

  if (!client) {
    return;
  }

  await client.quit().catch(() => {
    client.disconnect();
  });
}
