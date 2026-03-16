import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateWeightedScore, checkScoreThreshold } from '../src/features/audits/threshold-check.ts';

test('calculateWeightedScore prefers base plus level-1 weighting when both are present', () => {
  const result = calculateWeightedScore([
    { Url: 'https://example.com', score: 90 },
    { Url: 'https://example.com/about', score: 80 },
  ]);

  assert.equal(result.method, 'Preferred: 60% base + 40% level-1');
  assert.equal(result.finalScore, 86);
  assert.equal(result.breakdown.baseAvg, 90);
  assert.equal(result.breakdown.level1Avg, 80);
});

test('checkScoreThreshold fails invalid thresholds and reports pass/fail state', () => {
  assert.throws(() => checkScoreThreshold([], 101), /Threshold must be between 0 and 100/);

  const passResult = checkScoreThreshold([
    { Url: 'https://example.com', score: 84 },
  ], 80);

  assert.equal(passResult.pass, true);
  assert.equal(passResult.score, 84);
});
