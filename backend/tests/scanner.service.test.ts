import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldBlockPrecheckResource } from '../src/features/scanner/scanner.service.ts';

test('shouldBlockPrecheckResource blocks heavy asset types used only for precheck navigation', () => {
  assert.equal(shouldBlockPrecheckResource('image'), true);
  assert.equal(shouldBlockPrecheckResource('font'), true);
  assert.equal(shouldBlockPrecheckResource('media'), true);
  assert.equal(shouldBlockPrecheckResource('document'), false);
  assert.equal(shouldBlockPrecheckResource('script'), false);
});
