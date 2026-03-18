import mongoose from 'mongoose';

export interface HealthcareScoreDocument extends mongoose.Document {
  analysisRecordId: mongoose.Types.ObjectId;
  appointmentBookingScore: number; // 0‑100
  patientPortalScore: number; // 0‑100
  insuranceReadabilityScore: number; // 0‑100
  compositeScore: number; // weighted aggregate
}

const healthcareScoreSchema = new mongoose.Schema({
  analysisRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalysisRecord', required: true },
  appointmentBookingScore: { type: Number, default: 0 },
  patientPortalScore: { type: Number, default: 0 },
  insuranceReadabilityScore: { type: Number, default: 0 },
  compositeScore: { type: Number, default: 0 },
});

healthcareScoreSchema.index({ analysisRecordId: 1 }, { unique: true });

const HealthcareScore = mongoose.models.HealthcareScore as mongoose.Model<HealthcareScoreDocument> || mongoose.model<HealthcareScoreDocument>('HealthcareScore', healthcareScoreSchema);

export default HealthcareScore;
