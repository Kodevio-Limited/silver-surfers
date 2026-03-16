export interface LegalDocumentLike {
  _id?: unknown;
  type?: string;
  title?: string;
  content?: string;
  version?: string;
  effectiveDate?: Date | string | null;
  summary?: string | null;
  acceptanceRequired?: boolean;
  acceptanceDeadline?: Date | string | null;
  status?: string;
  language?: string;
  region?: string;
}

function toOptionalDate(value: Date | string | null | undefined): Date | string | undefined {
  if (value == null) {
    return undefined;
  }

  return value;
}

export function serializeLegalDocumentDetail(document: LegalDocumentLike): Record<string, unknown> {
  return {
    id: String(document._id || ''),
    type: document.type,
    title: document.title,
    content: document.content,
    version: document.version,
    effectiveDate: document.effectiveDate,
    summary: document.summary,
    acceptanceRequired: document.acceptanceRequired,
    acceptanceDeadline: toOptionalDate(document.acceptanceDeadline),
  };
}

export function serializeLegalDocumentSummary(document: LegalDocumentLike): Record<string, unknown> {
  return {
    id: String(document._id || ''),
    title: document.title,
    version: document.version,
    effectiveDate: document.effectiveDate,
    summary: document.summary,
    acceptanceRequired: document.acceptanceRequired,
  };
}

export function serializeLegalDocumentDebug(document: LegalDocumentLike): Record<string, unknown> {
  return {
    id: String(document._id || ''),
    type: document.type,
    title: document.title,
    status: document.status,
    language: document.language,
    region: document.region,
  };
}
