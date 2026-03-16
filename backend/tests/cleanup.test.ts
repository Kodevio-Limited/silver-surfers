import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

import { assertAllowedCleanupPath } from '../src/features/records/cleanup.service.ts';

test('assertAllowedCleanupPath allows report directories', () => {
  const reportsPath = path.resolve(process.cwd(), 'reports-lite', 'user', 'job-123');
  assert.equal(assertAllowedCleanupPath(reportsPath), reportsPath);
});

test('assertAllowedCleanupPath allows temp directories', () => {
  const tempPath = path.resolve(os.tmpdir(), 'silver-surfers-test-folder');
  assert.equal(assertAllowedCleanupPath(tempPath), tempPath);
});

test('assertAllowedCleanupPath rejects deleting an allowed root directly', () => {
  const reportsRoot = path.resolve(process.cwd(), 'reports-lite');
  assert.throws(() => assertAllowedCleanupPath(reportsRoot));
});

test('assertAllowedCleanupPath rejects unmanaged temp directories', () => {
  const tempPath = path.resolve(os.tmpdir(), 'random-folder-name');
  assert.throws(() => assertAllowedCleanupPath(tempPath));
});

test('assertAllowedCleanupPath rejects arbitrary paths', () => {
  assert.throws(() => assertAllowedCleanupPath('/etc/passwd'));
});
