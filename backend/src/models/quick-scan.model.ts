import mongoose from 'mongoose';

import { aiReportSchema, reportFileSchema, reportStorageSchema, scoreCardSchema } from './shared-schemas.ts';

const quickScanSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  firstName: {
    type: String,
    default: '',
  },
  lastName: {
    type: String,
    default: '',
  },
  scanScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  scoreCard: {
    type: scoreCardSchema,
    default: undefined,
  },
  scanDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued',
  },
  reportGenerated: {
    type: Boolean,
    default: false,
  },
  reportPath: {
    type: String,
    default: null,
  },
  reportDirectory: {
    type: String,
    default: null,
  },
  aiReport: {
    type: aiReportSchema,
    default: undefined,
  },
  reportStorage: {
    type: reportStorageSchema,
    default: undefined,
  },
  reportFiles: {
    type: [reportFileSchema],
    default: [],
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

quickScanSchema.index({ email: 1, scanDate: -1 });
quickScanSchema.index({ url: 1 });
quickScanSchema.index({ scanDate: -1 });

const QuickScan = (mongoose.models.QuickScan as mongoose.Model<unknown> | undefined)
  || mongoose.model('QuickScan', quickScanSchema);

export default QuickScan;
