import { Router } from 'express';

import LegalDocument from '../../models/legal-document.model.ts';
import { asyncHandler } from '../../shared/http/async-handler.ts';
import { adminRequired } from '../auth/admin.middleware.ts';
import { authRequired } from '../auth/auth.middleware.ts';
import {
  createLegalAcceptance,
  createLegalDocument,
  getAllLegalDocumentsAdmin,
  getAllLegalDocumentsPublic,
  getCurrentLegalDocument,
  getUserLegalAcceptances,
  hasAcceptedLegalDocument,
  publishLegalDocument,
  updateLegalDocument,
} from './legal.service.ts';
import {
  serializeLegalDocumentDebug,
  serializeLegalDocumentDetail,
  serializeLegalDocumentSummary,
} from './legal.serializers.ts';

const router = Router();

function readQueryString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

router.get('/debug/legal', asyncHandler(async (_request, response) => {
  const allDocuments = await LegalDocument.find({}).lean();
  const termsDocument = await getCurrentLegalDocument('terms-of-use', 'en', 'US');

  response.json({
    totalDocuments: allDocuments.length,
    allDocuments: allDocuments.map((document) => serializeLegalDocumentDebug(document)),
    termsDocument: termsDocument ? serializeLegalDocumentDebug(termsDocument) : null,
  });
}));

router.get('/legal/:type', asyncHandler(async (request, response) => {
  const type = String(request.params.type || '').trim();
  const language = readQueryString(request.query.language, 'en');
  const region = readQueryString(request.query.region, 'US');
  const document = await getCurrentLegalDocument(type, language, region);

  if (!document) {
    response.status(404).json({ error: 'Legal document not found' });
    return;
  }

  response.json(serializeLegalDocumentDetail(document));
}));

router.get('/legal', asyncHandler(async (request, response) => {
  const language = readQueryString(request.query.language, 'en');
  const region = readQueryString(request.query.region, 'US');
  const documents = await getAllLegalDocumentsPublic(language, region);
  const result: Record<string, Record<string, unknown>> = {};

  for (const document of documents) {
    if (document?.type) {
      result[document.type] = serializeLegalDocumentSummary(document);
    }
  }

  response.json(result);
}));

router.post('/legal/:type/accept', authRequired, asyncHandler(async (request, response) => {
  const type = String(request.params.type || '').trim();
  const userId = request.user?.id;

  if (!userId) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const document = await getCurrentLegalDocument(type);
  if (!document) {
    response.status(404).json({ error: 'Legal document not found' });
    return;
  }

  const existingAcceptance = await hasAcceptedLegalDocument(userId, document._id);
  if (existingAcceptance) {
    response.json({
      message: 'Already accepted',
      acceptedAt: existingAcceptance.acceptedAt,
      version: existingAcceptance.acceptedVersion,
    });
    return;
  }

  const acceptance = await createLegalAcceptance({
    userId,
    documentId: document._id,
    acceptedVersion: document.version,
    ipAddress: request.ip || request.socket.remoteAddress || undefined,
    userAgent: request.get('User-Agent') || undefined,
  });

  response.json({
    message: 'Legal document accepted successfully',
    acceptedAt: acceptance.acceptedAt,
    version: acceptance.acceptedVersion,
    documentType: document.type,
  });
}));

router.get('/legal/acceptances', authRequired, asyncHandler(async (request, response) => {
  const userId = request.user?.id;

  if (!userId) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const acceptances = await getUserLegalAcceptances(userId);
  response.json({ acceptances });
}));

router.get('/admin/legal', authRequired, adminRequired, asyncHandler(async (_request, response) => {
  const documents = await getAllLegalDocumentsAdmin();
  response.json({
    success: true,
    documents,
  });
}));

router.post('/admin/legal', authRequired, adminRequired, asyncHandler(async (request, response) => {
  const userId = request.user?.id;

  if (!userId) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const document = await createLegalDocument(request.body ?? {}, userId);

  response.status(201).json({
    message: 'Legal document created successfully',
    document: {
      id: String(document._id),
      type: document.type,
      title: document.title,
      version: document.version,
      status: document.status,
    },
  });
}));

router.put('/admin/legal/:id', authRequired, adminRequired, asyncHandler(async (request, response) => {
  const userId = request.user?.id;

  if (!userId) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const document = await updateLegalDocument(String(request.params.id || ''), request.body ?? {}, userId);

  if (!document) {
    response.status(404).json({ error: 'Legal document not found' });
    return;
  }

  response.json({
    message: 'Legal document updated successfully',
    document: {
      id: String(document._id),
      type: document.type,
      title: document.title,
      version: document.version,
      status: document.status,
      lastModified: document.lastModified,
    },
  });
}));

router.post('/admin/legal/:id/publish', authRequired, adminRequired, asyncHandler(async (request, response) => {
  const userId = request.user?.id;

  if (!userId) {
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const document = await publishLegalDocument(String(request.params.id || ''), userId);

  if (!document) {
    response.status(404).json({ error: 'Legal document not found' });
    return;
  }

  response.json({
    message: 'Legal document published successfully',
    document: {
      id: String(document._id),
      type: document.type,
      title: document.title,
      version: document.version,
      status: document.status,
      effectiveDate: document.effectiveDate,
    },
  });
}));

export default router;
