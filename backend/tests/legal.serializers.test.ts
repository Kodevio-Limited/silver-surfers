import test from 'node:test';
import assert from 'node:assert/strict';

import {
  serializeLegalDocumentDebug,
  serializeLegalDocumentDetail,
  serializeLegalDocumentSummary,
} from '../src/features/legal/legal.serializers.ts';

const sampleDocument = {
  _id: 'doc_123',
  type: 'terms-of-use',
  title: 'Terms of Use',
  content: '<p>Terms</p>',
  version: '2.0',
  effectiveDate: new Date('2026-03-01T00:00:00.000Z'),
  summary: 'Updated terms.',
  acceptanceRequired: true,
  acceptanceDeadline: new Date('2026-04-01T00:00:00.000Z'),
  status: 'published',
  language: 'en',
  region: 'US',
};

test('serializeLegalDocumentDetail returns public legal document fields', () => {
  const result = serializeLegalDocumentDetail(sampleDocument);

  assert.deepEqual(result, {
    id: 'doc_123',
    type: 'terms-of-use',
    title: 'Terms of Use',
    content: '<p>Terms</p>',
    version: '2.0',
    effectiveDate: sampleDocument.effectiveDate,
    summary: 'Updated terms.',
    acceptanceRequired: true,
    acceptanceDeadline: sampleDocument.acceptanceDeadline,
  });
});

test('serializeLegalDocumentSummary returns condensed legal fields', () => {
  const result = serializeLegalDocumentSummary(sampleDocument);

  assert.deepEqual(result, {
    id: 'doc_123',
    title: 'Terms of Use',
    version: '2.0',
    effectiveDate: sampleDocument.effectiveDate,
    summary: 'Updated terms.',
    acceptanceRequired: true,
  });
});

test('serializeLegalDocumentDebug returns admin/debug metadata', () => {
  const result = serializeLegalDocumentDebug(sampleDocument);

  assert.deepEqual(result, {
    id: 'doc_123',
    type: 'terms-of-use',
    title: 'Terms of Use',
    status: 'published',
    language: 'en',
    region: 'US',
  });
});
