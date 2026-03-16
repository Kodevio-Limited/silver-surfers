import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { cleanupManagedCache, isManagedTempReportFile } from '../src/infrastructure/cache/cache-manager.ts';

test('isManagedTempReportFile only targets backend-managed temp reports', () => {
  assert.equal(isManagedTempReportFile('report-example-com-123456-lite.json'), true);
  assert.equal(isManagedTempReportFile('report-example-com-123456.json'), true);
  assert.equal(isManagedTempReportFile('notes.txt'), false);
});

test('cleanupManagedCache removes stale temp reports and stale report directories only', async (t) => {
  const tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'silver-surfers-cache-temp-'));
  const reportRootPath = await fs.mkdtemp(path.join(os.tmpdir(), 'silver-surfers-cache-reports-'));
  const cleanupRoots = async () => {
    await Promise.all([
      fs.rm(tempRootPath, { recursive: true, force: true }),
      fs.rm(reportRootPath, { recursive: true, force: true }),
    ]);
  };
  t.after(async () => {
    await cleanupRoots();
  });
  const now = Date.now();
  const oldDate = new Date(now - 10_000);
  const freshDate = new Date(now - 500);

  const oldTempReport = path.join(tempRootPath, 'report-example-com-123456-lite.json');
  const unrelatedTempFile = path.join(tempRootPath, 'keep-me.txt');
  const oldReportDir = path.join(reportRootPath, 'user-a', 'job-old');
  const freshReportDir = path.join(reportRootPath, 'user-b', 'job-fresh');

  await fs.writeFile(oldTempReport, '{}', 'utf8');
  await fs.writeFile(unrelatedTempFile, 'keep', 'utf8');
  await fs.mkdir(oldReportDir, { recursive: true });
  await fs.writeFile(path.join(oldReportDir, 'report.pdf'), 'old', 'utf8');
  await fs.mkdir(freshReportDir, { recursive: true });
  await fs.writeFile(path.join(freshReportDir, 'report.pdf'), 'fresh', 'utf8');

  await Promise.all([
    fs.utimes(oldTempReport, oldDate, oldDate),
    fs.utimes(unrelatedTempFile, oldDate, oldDate),
    fs.utimes(path.join(oldReportDir, 'report.pdf'), oldDate, oldDate),
    fs.utimes(oldReportDir, oldDate, oldDate),
    fs.utimes(path.dirname(oldReportDir), oldDate, oldDate),
    fs.utimes(path.join(freshReportDir, 'report.pdf'), freshDate, freshDate),
    fs.utimes(freshReportDir, freshDate, freshDate),
    fs.utimes(path.dirname(freshReportDir), freshDate, freshDate),
  ]);

  const summary = await cleanupManagedCache({
    tempRootPath,
    reportRootPaths: [reportRootPath],
    tempReportTtlMs: 1_000,
    reportDirectoryTtlMs: 1_000,
    now,
  });

  await assert.rejects(() => fs.stat(oldTempReport));
  await assert.rejects(() => fs.stat(oldReportDir));
  await assert.doesNotReject(() => fs.stat(unrelatedTempFile));
  await assert.doesNotReject(() => fs.stat(freshReportDir));

  assert.equal(summary.removedFiles, 1);
  assert.equal(summary.removedDirectories >= 1, true);
});

test('cleanupManagedCache applies shorter TTL to reports-lite quick scan cache', async (t) => {
  const cacheRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'silver-surfers-cache-ttl-'));
  const reportsFullRoot = path.join(cacheRoot, 'reports-full');
  const reportsLiteRoot = path.join(cacheRoot, 'reports-lite');

  await Promise.all([
    fs.mkdir(reportsFullRoot, { recursive: true }),
    fs.mkdir(reportsLiteRoot, { recursive: true }),
  ]);

  t.after(async () => {
    await fs.rm(cacheRoot, { recursive: true, force: true });
  });

  const now = Date.now();
  const oldDate = new Date(now - 31 * 60 * 1000);
  const fullReportDir = path.join(reportsFullRoot, 'user-a', 'job-old');
  const quickScanDir = path.join(reportsLiteRoot, 'user-b', 'job-old');

  await fs.mkdir(fullReportDir, { recursive: true });
  await fs.writeFile(path.join(fullReportDir, 'report.pdf'), 'full', 'utf8');
  await fs.mkdir(quickScanDir, { recursive: true });
  await fs.writeFile(path.join(quickScanDir, 'report.pdf'), 'lite', 'utf8');

  await Promise.all([
    fs.utimes(path.join(fullReportDir, 'report.pdf'), oldDate, oldDate),
    fs.utimes(fullReportDir, oldDate, oldDate),
    fs.utimes(path.dirname(fullReportDir), oldDate, oldDate),
    fs.utimes(path.join(quickScanDir, 'report.pdf'), oldDate, oldDate),
    fs.utimes(quickScanDir, oldDate, oldDate),
    fs.utimes(path.dirname(quickScanDir), oldDate, oldDate),
  ]);

  await cleanupManagedCache({
    reportRootPaths: [reportsFullRoot, reportsLiteRoot],
    tempReportTtlMs: 60 * 60 * 1000,
    reportDirectoryTtlMs: 24 * 60 * 60 * 1000,
    quickScanReportTtlMs: 30 * 60 * 1000,
    now,
  });

  await assert.doesNotReject(() => fs.stat(fullReportDir));
  await assert.rejects(() => fs.stat(quickScanDir));
});
