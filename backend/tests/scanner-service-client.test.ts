import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { requestScannerAudit } from '../src/features/scanner/scanner-client.ts';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

test('requestScannerAudit reuses an accessible local report path from scanner-service', async (t) => {
  const reportPath = path.join(os.tmpdir(), `scanner-service-client-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ ok: true }), 'utf8');

  t.after(async () => {
    await fs.rm(reportPath, { force: true }).catch(() => undefined);
  });

  const result = await requestScannerAudit({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true,
    includeReport: true,
  }, async () => jsonResponse({
    success: true,
    reportPath,
    report: { categories: { 'senior-friendly-lite': { score: 0.91 } } },
    isLiteVersion: true,
    version: 'Lite',
    url: 'https://example.com',
    device: 'desktop',
    strategy: 'Node-Lighthouse',
    attemptNumber: 1,
    message: 'done',
  }));

  assert.equal(result.success, true);
  assert.equal(result.reportPath, reportPath);
});

test('requestScannerAudit falls back to writing an inline report when scanner-service path is not locally accessible', async (t) => {
  let generatedPath: string | undefined;

  const result = await requestScannerAudit({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true,
    includeReport: true,
  }, async () => jsonResponse({
    success: true,
    reportPath: '/tmp/does-not-exist/report.json',
    report: {
      finalUrl: 'https://example.com',
      categories: {
        'senior-friendly-lite': { score: 0.84 },
      },
    },
    isLiteVersion: true,
    version: 'Lite',
    url: 'https://example.com',
    device: 'desktop',
  }));

  assert.equal(result.success, true);
  assert.notEqual(result.reportPath, '/tmp/does-not-exist/report.json');

  generatedPath = result.reportPath;
  const savedReport = JSON.parse(await fs.readFile(generatedPath, 'utf8')) as { finalUrl?: string };
  assert.equal(savedReport.finalUrl, 'https://example.com');

  t.after(async () => {
    if (generatedPath) {
      await fs.rm(generatedPath, { force: true }).catch(() => undefined);
    }
  });
});

test('requestScannerAudit exposes a clear browser configuration error from scanner-service 500 responses', async () => {
  const result = await requestScannerAudit({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true,
    includeReport: true,
  }, async () => jsonResponse({
    error: 'Internal server error',
    details: {
      stderr: 'Lighthouse error: Unable to locate a Chrome/Chromium executable. Set CHROME_PATH or CHROMIUM_PATH.',
    },
  }, 500));

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'SCANNER_BROWSER_UNAVAILABLE');
  assert.equal(result.error, 'The scanner service browser is not configured correctly. Please contact support.');
  assert.equal(result.statusCode, 500);
});
