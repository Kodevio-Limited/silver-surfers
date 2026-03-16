import mongoose from 'mongoose';

import { reportStorageSchema } from './shared-schemas.ts';

const auditJobSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  url: { type: String, required: true },
  taskId: { type: String, unique: true, required: true, index: true },
  jobType: {
    type: String,
    enum: ['full-audit', 'quick-scan'],
    required: true,
    index: true,
  },
  planId: { type: String },
  selectedDevice: { type: String },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'queued',
    index: true,
  },
  priority: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastError: { type: String },
  failureReason: { type: String },
  queuedAt: { type: Date, default: Date.now, index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  estimatedDuration: { type: Number },
  reportDirectory: { type: String },
  reportStorage: { type: reportStorageSchema, default: undefined },
  emailStatus: {
    type: String,
    enum: ['pending', 'sending', 'sent', 'failed'],
    default: 'pending',
  },
  attachmentCount: { type: Number, default: 0 },
  emailAccepted: { type: [String], default: [] },
  emailRejected: { type: [String], default: [] },
  emailError: { type: String },
  scansUsed: { type: Number, default: 0 },
  userAgent: { type: String },
  ipAddress: { type: String },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  quickScanId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickScan' },
  firstName: { type: String },
  lastName: { type: String },
  processingNode: { type: String },
  workerId: { type: String, index: true },
  queueBackend: { type: String, default: 'persistent', index: true },
  leaseHeartbeatAt: { type: Date, index: true },
  processingLeaseExpiresAt: { type: Date, index: true },
  browserLockAcquired: { type: Boolean, default: false },
  stalledRecoveryCount: { type: Number, default: 0 },
  retryAfter: { type: Date },
  retryCount: { type: Number, default: 0 },
  cleanupRequired: { type: Boolean, default: false },
  cleanupCompleted: { type: Boolean, default: false },
  progress: {
    currentStep: { type: String },
    totalSteps: { type: Number },
    completedSteps: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
});

auditJobSchema.index({ status: 1, priority: -1, queuedAt: 1 });
auditJobSchema.index({ email: 1, createdAt: -1 });
auditJobSchema.index({ userId: 1, createdAt: -1 });
auditJobSchema.index({ status: 1, retryAfter: 1 });
auditJobSchema.index({ jobType: 1, status: 1, processingLeaseExpiresAt: 1 });

function clearProcessingState(job: Record<string, unknown>): void {
  job.processingNode = undefined;
  job.workerId = undefined;
  job.leaseHeartbeatAt = undefined;
  job.processingLeaseExpiresAt = undefined;
  job.browserLockAcquired = false;
}

auditJobSchema.virtual('age').get(function (this: { queuedAt?: Date }) {
  return this.queuedAt ? Date.now() - this.queuedAt.getTime() : null;
});

auditJobSchema.virtual('processingDuration').get(function (this: { startedAt?: Date; completedAt?: Date }) {
  if (this.startedAt && this.completedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  return null;
});

auditJobSchema.methods.startProcessing = function (this: any, processingNode: string) {
  this.status = 'processing';
  this.startedAt = new Date();
  this.processingNode = processingNode;
  this.workerId = processingNode;
  this.leaseHeartbeatAt = new Date();
  this.attempts += 1;
  return this.save();
};

auditJobSchema.methods.complete = function (this: any, results: Record<string, unknown> = {}) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.emailStatus = results.emailStatus || 'pending';
  this.attachmentCount = results.attachmentCount || 0;
  this.reportDirectory = results.reportDirectory;
  this.reportStorage = results.reportStorage;
  this.scansUsed = results.scansUsed || 1;
  this.cleanupRequired = true;
  this.cleanupCompleted = false;
  this.retryAfter = undefined;
  clearProcessingState(this);
  return this.save();
};

auditJobSchema.methods.fail = function (
  this: any,
  error: string,
  failureReason: string,
  options: { maxAttempts?: number; baseRetryDelayMs?: number } = {},
) {
  if (Number.isFinite(options.maxAttempts) && Number(options.maxAttempts) > 0) {
    this.maxAttempts = options.maxAttempts;
  }

  this.status = 'failed';
  this.completedAt = new Date();
  this.lastError = error;
  this.failureReason = failureReason;
  clearProcessingState(this);

  const baseRetryDelayMs = Number.isFinite(options.baseRetryDelayMs) && Number(options.baseRetryDelayMs) > 0
    ? Number(options.baseRetryDelayMs)
    : 1000;
  this.retryCount += 1;

  if (this.retryCount < this.maxAttempts) {
    const retryDelay = Math.min(baseRetryDelayMs * Math.pow(2, Math.max(this.retryCount - 1, 0)), 300000);
    this.retryAfter = new Date(Date.now() + retryDelay);
  } else {
    this.retryAfter = undefined;
  }

  return this.save();
};

auditJobSchema.methods.canRetry = function (this: any) {
  return this.retryCount < this.maxAttempts && this.status === 'failed';
};

auditJobSchema.methods.resetForRetry = function (this: any) {
  this.status = 'queued';
  this.startedAt = undefined;
  this.completedAt = undefined;
  this.retryAfter = undefined;
  clearProcessingState(this);
  this.progress = { currentStep: 'queued', totalSteps: 0, completedSteps: 0 };
  return this.save();
};

auditJobSchema.statics.getNextJob = async function (
  this: any,
  jobType: string | null = null,
  workerId = 'unknown-worker',
  leaseDurationMs = 60000,
) {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + leaseDurationMs);
  const query: Record<string, unknown> = {
    status: 'queued',
    $or: [
      { retryAfter: { $exists: false } },
      { retryAfter: { $lte: now } },
    ],
  };

  if (jobType) {
    query.jobType = jobType;
  }

  return this.findOneAndUpdate(
    query,
    {
      $set: {
        status: 'processing',
        startedAt: now,
        processingNode: workerId,
        workerId,
        leaseHeartbeatAt: now,
        processingLeaseExpiresAt: leaseExpiry,
      },
      $inc: {
        attempts: 1,
      },
    },
    {
      sort: { priority: -1, queuedAt: 1 },
      new: true,
    },
  );
};

auditJobSchema.statics.renewLease = function (
  this: any,
  jobId: string,
  workerId: string,
  leaseDurationMs = 60000,
) {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + leaseDurationMs);

  return this.updateOne(
    {
      _id: jobId,
      status: 'processing',
      workerId,
    },
    {
      $set: {
        leaseHeartbeatAt: now,
        processingLeaseExpiresAt: leaseExpiry,
      },
    },
  );
};

auditJobSchema.statics.getStaleProcessingJobs = function (
  this: any,
  jobType: string | null = null,
  now = new Date(),
  limit = 50,
) {
  const query: Record<string, unknown> = {
    status: 'processing',
    processingLeaseExpiresAt: { $lte: now },
  };

  if (jobType) {
    query.jobType = jobType;
  }

  return this.find(query)
    .sort({ processingLeaseExpiresAt: 1 })
    .limit(limit);
};

auditJobSchema.statics.getFailedJobs = function (this: any, jobType: string | null = null, limit = 50) {
  const query: Record<string, unknown> = {
    status: 'failed',
    $expr: { $lt: ['$retryCount', '$maxAttempts'] },
  };

  if (jobType) {
    query.jobType = jobType;
  }

  return this.find(query)
    .sort({ retryAfter: 1 })
    .limit(limit);
};

auditJobSchema.statics.cleanupOldJobs = function (this: any, daysOld = 30) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  return this.deleteMany({
    status: { $in: ['completed', 'failed', 'cancelled'] },
    completedAt: { $lt: cutoffDate },
  });
};

auditJobSchema.pre('save', function (this: any, next: (error?: Error) => void) {
  if (this.isNew && !this.estimatedDuration) {
    this.estimatedDuration = this.jobType === 'full-audit' ? 300000 : 60000;
  }
  next();
});

const AuditJob = (mongoose.models.AuditJob as mongoose.Model<unknown> | undefined)
  || mongoose.model('AuditJob', auditJobSchema);

export default AuditJob;
