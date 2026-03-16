import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.ts';
import { buildCandidateUrls, precheckCandidateUrl } from '../src/features/audits/precheck.service.ts';

test('buildCandidateUrls prefers https when protocol is missing', () => {
  assert.deepEqual(buildCandidateUrls('example.com'), {
    input: 'example.com',
    candidateUrls: ['https://example.com', 'http://example.com'],
  });
});

test('buildCandidateUrls preserves an explicit protocol', () => {
  assert.deepEqual(buildCandidateUrls('https://example.com/path'), {
    input: 'https://example.com/path',
    candidateUrls: ['https://example.com/path'],
  });
});

test('precheckCandidateUrl uses scanner-service precheck result when available', async () => {
  const calls: Array<{ url: string; method?: string }> = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method });

    return new Response(JSON.stringify({
      success: true,
      finalUrl: 'https://example.com/',
      status: 200,
      redirected: false,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await precheckCandidateUrl('https://example.com', fetchImpl);

  assert.deepEqual(result, {
    ok: true,
    finalUrl: 'https://example.com/',
    status: 200,
    redirected: false,
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/precheck$/);
  assert.equal(calls[0].method, 'POST');
});

test('precheckCandidateUrl falls back to direct fetch when scanner-service precheck fails', async () => {
  const calls: Array<{ url: string; method?: string }> = [];

  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method });

    if (calls.length === 1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'scanner unavailable',
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('', { status: 200 });
  };

  const result = await precheckCandidateUrl('https://example.com', fetchImpl);

  assert.deepEqual(result, {
    ok: true,
    finalUrl: 'https://example.com',
    status: 200,
    redirected: false,
  });
  assert.deepEqual(calls, [
    { url: `${env.scannerServiceUrl}/precheck`, method: 'POST' },
    { url: 'https://example.com', method: 'HEAD' },
  ]);
});
