import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import axios from 'axios';

import { tryPythonScanner } from '../my-app/services/load_and_audit/python-scanner-client.js';

test('tryPythonScanner reuses local reportPath when scanner-service omits inline report payload', async (t) => {
  t.after(async () => {
    mock.restoreAll();
  });

  const reportPath = path.join(os.tmpdir(), `scanner-client-${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ categories: { 'senior-friendly-lite': { score: 0.91 } } }), 'utf8');

  t.after(async () => {
    await fs.rm(reportPath, { force: true }).catch(() => undefined);
  });

  mock.method(axios, 'post', async () => ({
    data: {
      success: true,
      reportPath,
      isLiteVersion: true,
      version: 'Lite',
      url: 'https://example.com',
      device: 'desktop',
      strategy: 'Node-Lighthouse',
      attemptNumber: 1,
      message: 'done',
    }
  }));

  const result = await tryPythonScanner({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true
  });

  assert.equal(result.success, true);
  assert.equal(result.reportPath, reportPath);
  assert.equal('report' in result, false);
});

test('tryPythonScanner exposes a clear browser configuration error from scanner-service 500 responses', async (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  mock.method(axios, 'post', async () => {
    throw {
      response: {
        status: 500,
        data: {
          error: 'Internal server error',
          details: {
            stderr: 'Lighthouse error: Unable to locate a Chrome/Chromium executable. Set CHROME_PATH or CHROMIUM_PATH.'
          }
        }
      },
      message: 'Request failed with status code 500'
    };
  });

  const result = await tryPythonScanner({
    url: 'https://example.com',
    device: 'desktop',
    format: 'json',
    isLiteVersion: true
  });

  assert.equal(result.success, false);
  assert.equal(result.errorCode, 'SCANNER_BROWSER_UNAVAILABLE');
  assert.equal(result.error, 'The scanner service browser is not configured correctly. Please contact support.');
  assert.equal(result.statusCode, 500);
});
