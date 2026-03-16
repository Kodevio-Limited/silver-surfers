import mongoose from 'mongoose';

const legalDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['terms-of-use', 'privacy-policy', 'cookie-policy', 'data-processing-agreement', 'accessibility-guides'],
      required: true,
      index: true,
    },
    version: { type: String, required: true, default: '1.0' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    summary: { type: String },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    effectiveDate: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
    language: { type: String, default: 'en' },
    region: { type: String, default: 'US' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changeLog: [{
      version: String,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      changedAt: { type: Date, default: Date.now },
      changes: String,
      reason: String,
    }],
    acceptanceRequired: { type: Boolean, default: true },
    acceptanceDeadline: Date,
    metaTitle: String,
    metaDescription: String,
    slug: { type: String, unique: true, index: true },
    lastLegalReview: Date,
    nextReviewDue: Date,
    reviewedBy: String,
    supersedes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LegalDocument' }],
    supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalDocument' },
  },
  { timestamps: true },
);

legalDocumentSchema.index({ type: 1, status: 1, effectiveDate: -1 });
legalDocumentSchema.index({ type: 1, language: 1, region: 1 });

legalDocumentSchema.pre('save', function (next: (error?: Error) => void) {
  const draft = this as {
    slug?: string;
    type?: string;
    version?: string;
    effectiveDate?: Date;
    nextReviewDue?: Date;
    isNew?: boolean;
    isModified?(field: string): boolean;
  };

  if (!draft.slug && draft.type && draft.version) {
    draft.slug = `${draft.type}-${draft.version}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  if ((draft.isNew || draft.isModified?.('effectiveDate')) && draft.effectiveDate) {
    draft.nextReviewDue = new Date(draft.effectiveDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  next();
});

const LegalDocument = (mongoose.models.LegalDocument as mongoose.Model<unknown> | undefined)
  || mongoose.model('LegalDocument', legalDocumentSchema);

export default LegalDocument;
