import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { requestScannerAudit } from '../src/features/scanner/scanner-client.ts';

test('requestScannerAudit reuses local reportPath when scanner-service omits inline report payload', async (t) => {
  t.after(async () => {
    mock.restoreAll();
  });

  const reportPath = path.join(os.tmpdir(), `scanner-client-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ categories: { 'senior-friendly-lite': { score: 0.91 } } }), 'utf8');

  t.after(async () => {
    await fs.rm(reportPath, { force: true }).catch(() => undefined);
  });

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      reportPath,
      isLiteVersion: true,
      version: 'Lite',
      url: 'https://example.com',
      device: 'desktop',
      strategy: 'Node-Lighthouse',
      attemptNumber: 1,
      message: 'done',
    })
  });

  const result = await requestScannerAudit({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true
  }, mockFetch as any);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.reportPath, reportPath);
    assert.equal('report' in result, false);
  }
});

test('requestScannerAudit exposes a clear browser configuration error from scanner-service 500 responses', async (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  const mockFetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({
      success: false,
      error: 'Internal server error',
      details: {
        stderr: 'Lighthouse error: Unable to locate a Chrome/Chromium executable. Set CHROME_PATH or CHROMIUM_PATH.'
      }
    })
  });

  const result = await requestScannerAudit({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true
  }, mockFetch as any);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.errorCode, 'SCANNER_BROWSER_UNAVAILABLE');
    assert.equal(result.error, 'The scanner service browser is not configured correctly. Please contact support.');
    assert.equal(result.statusCode, 500);
  }
});
