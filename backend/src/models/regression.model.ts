import mongoose from 'mongoose';

export interface RegressionDocument extends mongoose.Document {
  analysisRecordId: mongoose.Types.ObjectId;
  previousScore: number;
  currentScore: number;
  delta: number;
  detectedAt: Date;
}

const regressionSchema = new mongoose.Schema({
  analysisRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalysisRecord', required: true },
  previousScore: { type: Number, required: true },
  currentScore: { type: Number, required: true },
  delta: { type: Number, required: true },
  detectedAt: { type: Date, default: Date.now },
});

regressionSchema.index({ analysisRecordId: 1 });

const Regression = mongoose.models.Regression as mongoose.Model<RegressionDocument> || mongoose.model<RegressionDocument>('Regression', regressionSchema);

export default Regression;
