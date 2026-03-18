import mongoose from 'mongoose';

export interface ScheduledScanDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  url: string;
  cronExpression: string; // e.g. '0 0 * * *' for daily
  nextRunAt?: Date;
  lastRunAt?: Date;
  status: 'active' | 'paused' | 'completed';
}

const scheduledScanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  cronExpression: { type: String, required: true },
  nextRunAt: { type: Date },
  lastRunAt: { type: Date },
  status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active' },
});

scheduledScanSchema.index({ user: 1, url: 1 }, { unique: true });

const ScheduledScan = mongoose.models.ScheduledScan as mongoose.Model<ScheduledScanDocument> || mongoose.model<ScheduledScanDocument>('ScheduledScan', scheduledScanSchema);

export default ScheduledScan;
