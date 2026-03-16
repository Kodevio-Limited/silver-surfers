import LegalAcceptance from '../../models/legal-acceptance.model.ts';
import LegalDocument from '../../models/legal-document.model.ts';

export interface CreateLegalDocumentInput {
  type: string;
  title: string;
  content: string;
  summary?: string;
  version?: string;
  language?: string;
  region?: string;
  acceptanceRequired?: boolean;
  acceptanceDeadline?: string | Date;
  metaTitle?: string;
  metaDescription?: string;
}

export async function getCurrentLegalDocument(type: string, language = 'en', region = 'US') {
  return LegalDocument.findOne({
    type,
    language,
    region,
    status: 'published',
  }).sort({ effectiveDate: -1 });
}

export async function getAllLegalDocumentsAdmin() {
  return LegalDocument.find({}).sort({ createdAt: -1 }).lean();
}

export async function getAllLegalDocumentsPublic(language = 'en', region = 'US') {
  return Promise.all([
    getCurrentLegalDocument('terms-of-use', language, region),
    getCurrentLegalDocument('privacy-policy', language, region),
  ]);
}

export async function hasAcceptedLegalDocument(userId: string, documentId: unknown) {
  return LegalAcceptance.findOne({
    user: userId,
    document: documentId,
    consentGiven: true,
    withdrawalDate: { $exists: false },
  });
}

export async function getUserLegalAcceptances(userId: string) {
  return LegalAcceptance.find({ user: userId })
    .populate('document', 'type title version effectiveDate')
    .sort({ acceptedAt: -1 })
    .lean();
}

export async function createLegalAcceptance(input: {
  userId: string;
  documentId: unknown;
  acceptedVersion: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  return LegalAcceptance.create({
    user: input.userId,
    document: input.documentId,
    acceptedVersion: input.acceptedVersion,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    acceptanceMethod: 'manual',
  });
}

export async function createLegalDocument(input: CreateLegalDocumentInput, userId: string) {
  return LegalDocument.create({
    type: input.type,
    title: input.title,
    content: input.content,
    summary: input.summary,
    version: input.version,
    language: input.language || 'en',
    region: input.region || 'US',
    acceptanceRequired: input.acceptanceRequired ?? true,
    acceptanceDeadline: input.acceptanceDeadline ? new Date(input.acceptanceDeadline) : undefined,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    createdBy: userId,
    lastModifiedBy: userId,
    status: 'draft',
  });
}

export async function updateLegalDocument(
  id: string,
  updateData: Record<string, unknown>,
  userId: string,
) {
  return LegalDocument.findByIdAndUpdate(
    id,
    {
      ...updateData,
      lastModifiedBy: userId,
      lastModified: new Date(),
    },
    { new: true, runValidators: true },
  );
}

export async function publishLegalDocument(id: string, userId: string) {
  const document = await LegalDocument.findById(id);
  if (!document) {
    return null;
  }

  await LegalDocument.updateMany(
    {
      type: document.type,
      _id: { $ne: document._id },
      status: 'published',
    },
    {
      status: 'archived',
      supersededBy: document._id,
    },
  );

  document.status = 'published';
  document.effectiveDate = new Date();
  document.lastModified = new Date();
  document.lastModifiedBy = userId;
  await document.save();

  return document;
}
