import mongoose from 'mongoose';

export interface CertificationDocument extends mongoose.Document {
  analysisRecordId: mongoose.Types.ObjectId;
  badgeUrl: string;
  issuedAt: Date;
  expiresAt: Date;
  status: 'active' | 'revoked' | 'expired';
}

const certificationSchema = new mongoose.Schema({
  analysisRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalysisRecord', required: true },
  badgeUrl: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
});

certificationSchema.index({ analysisRecordId: 1 }, { unique: true });

const Certification = mongoose.models.Certification as mongoose.Model<CertificationDocument> || mongoose.model<CertificationDocument>('Certification', certificationSchema);

export default Certification;
