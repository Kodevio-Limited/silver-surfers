import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeScannerChildLogs } from '../src/features/scanner/scanner-log-summary.ts';

test('summarizeScannerChildLogs keeps highlights and classifies Lighthouse status lines as progress', () => {
  const stdout = [
    'Launching Chrome/Chromium from: /usr/bin/google-chrome-stable',
    '✅ Chrome/Chromium launched successfully on port 38893',
    'noise that should be ignored',
    'Lighthouse report saved to /tmp/report-lite.json',
  ].join('\n');

  const stderr = [
    '2026-03-16T05:40:20.119Z LH:status Connecting to browser',
    '2026-03-16T05:40:32.689Z LH:status Generating results...',
  ].join('\n');

  const summary = summarizeScannerChildLogs(stdout, stderr);

  assert.equal(summary.stdoutLineCount, 4);
  assert.deepEqual(summary.stdoutHighlights, [
    'Launching Chrome/Chromium from: /usr/bin/google-chrome-stable',
    '✅ Chrome/Chromium launched successfully on port 38893',
    'Lighthouse report saved to /tmp/report-lite.json',
  ]);
  assert.equal(summary.statusCount, 2);
  assert.equal(summary.lastStatus, 'Generating results...');
  assert.deepEqual(summary.warningLines, []);
});

test('summarizeScannerChildLogs preserves non-progress stderr output as warnings', () => {
  const summary = summarizeScannerChildLogs('', [
    '2026-03-16T05:40:20.119Z LH:status Connecting to browser',
    'Unhandled warning from runner',
  ].join('\n'));

  assert.equal(summary.statusCount, 1);
  assert.deepEqual(summary.warningLines, ['Unhandled warning from runner']);
});
