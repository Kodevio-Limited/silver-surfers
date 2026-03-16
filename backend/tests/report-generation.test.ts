import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractSiteNameFromUrl,
  getReportPageName,
  getScoreStatus,
} from '../src/features/audits/report-generation.ts';

test('extractSiteNameFromUrl normalizes hostnames into readable names', () => {
  assert.equal(extractSiteNameFromUrl('https://www.silver-surfers.ai/dashboard'), 'Silver Surfers');
  assert.equal(extractSiteNameFromUrl('invalid-url'), 'Invalid Url');
});

test('getReportPageName derives readable page names from report URLs', () => {
  assert.equal(getReportPageName('https://example.com/'), 'Home Page');
  assert.equal(getReportPageName('https://example.com/patient-portal/login'), 'Login Page');
  assert.equal(getReportPageName('not-a-url'), 'Page');
});

test('getScoreStatus returns the expected label and color by score band', () => {
  assert.deepEqual(getScoreStatus(88), { label: 'Pass', color: '#10B981' });
  assert.deepEqual(getScoreStatus(74), { label: 'Needs Improvement', color: '#F59E0B' });
  assert.deepEqual(getScoreStatus(50), { label: 'Fail', color: '#EF4444' });
  assert.deepEqual(getScoreStatus(null), { label: 'N/A', color: '#6B7280' });
});
