import mongoose from 'mongoose';

import { aiReportSchema, reportFileSchema, reportStorageSchema, scoreCardSchema } from './shared-schemas.ts';

const analysisRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: false },
  email: { type: String, index: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  url: { type: String, required: true },
  taskId: { type: String, index: true },
  stripeSessionId: { type: String, index: true },
  planId: { type: String, default: null },
  device: { type: String, default: null },
  score: { type: Number, default: null },
  scoreCard: { type: scoreCardSchema, default: undefined },
  aiReport: { type: aiReportSchema, default: undefined },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
  emailStatus: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
  reportDirectory: { type: String },
  reportStorage: { type: reportStorageSchema, default: undefined },
  reportFiles: { type: [reportFileSchema], default: [] },
  emailError: { type: String },
  emailAccepted: { type: [String], default: [] },
  emailRejected: { type: [String], default: [] },
  attachmentCount: { type: Number, default: 0 },
  failureReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

analysisRecordSchema.index({ email: 1, createdAt: -1 });
analysisRecordSchema.index({ user: 1, createdAt: -1 });

analysisRecordSchema.pre('save', function (next: (error?: Error) => void) {
  (this as { updatedAt?: Date }).updatedAt = new Date();
  next();
});

const AnalysisRecord = (mongoose.models.AnalysisRecord as mongoose.Model<unknown> | undefined)
  || mongoose.model('AnalysisRecord', analysisRecordSchema);

export default AnalysisRecord;
