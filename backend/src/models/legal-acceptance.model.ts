import mongoose from 'mongoose';

const legalAcceptanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LegalDocument',
      required: true,
      index: true,
    },
    acceptedAt: { type: Date, default: Date.now },
    acceptedVersion: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    acceptanceMethod: {
      type: String,
      enum: ['signup', 'login', 'mandatory-update', 'manual'],
      default: 'signup',
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    consentGiven: { type: Boolean, default: true },
    withdrawalDate: Date,
    withdrawalReason: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

legalAcceptanceSchema.index({ user: 1, document: 1 }, { unique: true });
legalAcceptanceSchema.index({ document: 1, acceptedAt: -1 });
legalAcceptanceSchema.index({ user: 1, acceptedAt: -1 });

legalAcceptanceSchema.pre('save', function (next: (error?: Error) => void) {
  (this as { updatedAt?: Date }).updatedAt = new Date();
  next();
});

const LegalAcceptance = (mongoose.models.LegalAcceptance as mongoose.Model<unknown> | undefined)
  || mongoose.model('LegalAcceptance', legalAcceptanceSchema);

export default LegalAcceptance;
