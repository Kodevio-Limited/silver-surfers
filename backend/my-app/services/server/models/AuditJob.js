import mongoose from 'mongoose';

const storedObjectSchema = new mongoose.Schema({
  filename: { type: String },
  key: { type: String },
  size: { type: Number },
  sizeMB: { type: String },
  fileId: { type: String },
  providerUrl: { type: String }
}, { _id: false });

const reportStorageSchema = new mongoose.Schema({
  provider: { type: String },
  bucket: { type: String },
  region: { type: String },
  prefix: { type: String },
  objectCount: { type: Number, default: 0 },
  signedUrlExpiresInSeconds: { type: Number },
  objects: { type: [storedObjectSchema], default: [] }
}, { _id: false });

const auditJobSchema = new mongoose.Schema({
  // Basic job information
  email: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  url: { type: String, required: true },
  taskId: { type: String, unique: true, required: true, index: true },
  
  // Job type and configuration
  jobType: { 
    type: String, 
    enum: ['full-audit', 'quick-scan'], 
    required: true,
    index: true 
  },
  // Plan and device context
  planId: { type: String },
  selectedDevice: { type: String },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'queued',
    index: true 
  },
  
  // Processing details
  priority: { type: Number, default: 0 }, // Higher number = higher priority
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  
  // Error handling
  lastError: { type: String },
  failureReason: { type: String },
  
  // Timing information
  queuedAt: { type: Date, default: Date.now, index: true },
  startedAt: { type: Date },
  completedAt: { type: Date },
  estimatedDuration: { type: Number }, // in milliseconds
  
  // Results
  reportDirectory: { type: String },
  reportStorage: { type: reportStorageSchema, default: undefined },
  emailStatus: { 
    type: String, 
    enum: ['pending', 'sending', 'sent', 'failed'], 
    default: 'pending' 
  },
  attachmentCount: { type: Number, default: 0 },
  
  // Email details
  emailAccepted: { type: [String], default: [] },
  emailRejected: { type: [String], default: [] },
  emailError: { type: String },
  
  // Usage tracking
  scansUsed: { type: Number, default: 0 }, // How many scans this job consumed
  
  // Metadata
  userAgent: { type: String },
  ipAddress: { type: String },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  quickScanId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuickScan' }, // Link to QuickScan record
  
  // User details (for email personalization)
  firstName: { type: String },
  lastName: { type: String },
  
  // Processing context
  processingNode: { type: String }, // Which server instance is processing this
  workerId: { type: String, index: true },
  queueBackend: { type: String, default: 'persistent', index: true },
  leaseHeartbeatAt: { type: Date, index: true },
  processingLeaseExpiresAt: { type: Date, index: true },
  browserLockAcquired: { type: Boolean, default: false },
  stalledRecoveryCount: { type: Number, default: 0 },
  
  // Retry and recovery
  retryAfter: { type: Date }, // When to retry if failed
  retryCount: { type: Number, default: 0 },
  
  // Cleanup tracking
  cleanupRequired: { type: Boolean, default: false },
  cleanupCompleted: { type: Boolean, default: false },
  
  // Progress tracking
  progress: { 
    currentStep: { type: String },
    totalSteps: { type: Number },
    completedSteps: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
auditJobSchema.index({ status: 1, priority: -1, queuedAt: 1 }); // For job processing
auditJobSchema.index({ email: 1, createdAt: -1 }); // For user history
auditJobSchema.index({ userId: 1, createdAt: -1 }); // For user jobs
auditJobSchema.index({ status: 1, retryAfter: 1 }); // For retry processing
auditJobSchema.index({ jobType: 1, status: 1, processingLeaseExpiresAt: 1 }); // For stale job recovery

function clearProcessingState(job) {
  job.processingNode = undefined;
  job.workerId = undefined;
  job.leaseHeartbeatAt = undefined;
  job.processingLeaseExpiresAt = undefined;
  job.browserLockAcquired = false;
}

// Virtual for job age
auditJobSchema.virtual('age').get(function() {
  return Date.now() - this.queuedAt.getTime();
});

// Virtual for processing duration
auditJobSchema.virtual('processingDuration').get(function() {
  if (this.startedAt && this.completedAt) {
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
  return null;
});

// Methods
auditJobSchema.methods.startProcessing = function(processingNode) {
  this.status = 'processing';
  this.startedAt = new Date();
  this.processingNode = processingNode;
  this.workerId = processingNode;
  this.leaseHeartbeatAt = new Date();
  this.attempts += 1;
  return this.save();
};

auditJobSchema.methods.complete = function(results = {}) {
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

auditJobSchema.methods.fail = function(error, failureReason, options = {}) {
  if (Number.isFinite(options.maxAttempts) && options.maxAttempts > 0) {
    this.maxAttempts = options.maxAttempts;
  }

  this.status = 'failed';
  this.completedAt = new Date();
  this.lastError = error;
  this.failureReason = failureReason;
  clearProcessingState(this);
  
  // Calculate retry time (exponential backoff)
  const baseRetryDelayMs = Number.isFinite(options.baseRetryDelayMs) && options.baseRetryDelayMs > 0
    ? options.baseRetryDelayMs
    : 1000;
  this.retryCount += 1;

  if (this.retryCount < this.maxAttempts) {
    const retryDelay = Math.min(baseRetryDelayMs * Math.pow(2, Math.max(this.retryCount - 1, 0)), 300000); // Max 5 minutes
    this.retryAfter = new Date(Date.now() + retryDelay);
  } else {
    this.retryAfter = undefined;
  }
  
  return this.save();
};

auditJobSchema.methods.canRetry = function() {
  return this.retryCount < this.maxAttempts && this.status === 'failed';
};

auditJobSchema.methods.resetForRetry = function() {
  this.status = 'queued';
  this.startedAt = undefined;
  this.completedAt = undefined;
  this.retryAfter = undefined;
  clearProcessingState(this);
  this.progress = { currentStep: 'queued', totalSteps: 0, completedSteps: 0 };
  return this.save();
};

// Static methods
auditJobSchema.statics.getNextJob = async function(jobType = null, workerId = 'unknown-worker', leaseDurationMs = 60000) {
  const now = new Date();
  const leaseExpiry = new Date(now.getTime() + leaseDurationMs);
  const query = {
    status: 'queued',
    $or: [
      { retryAfter: { $exists: false } },
      { retryAfter: { $lte: now } }
    ]
  };
  
  // Filter by job type if specified
  if (jobType) {
    query.jobType = jobType;
  }
  
  // Use findOneAndUpdate to atomically claim the job and prevent duplicate processing
  // This ensures only one worker can claim a job at a time
  const job = await this.findOneAndUpdate(
    query,
    {
      $set: {
        status: 'processing',
        startedAt: now,
        processingNode: workerId,
        workerId,
        leaseHeartbeatAt: now,
        processingLeaseExpiresAt: leaseExpiry
      },
      $inc: {
        attempts: 1
      }
    },
    {
      sort: { priority: -1, queuedAt: 1 },
      new: true // Return the updated document
    }
  );
  
  return job;
};

auditJobSchema.statics.renewLease = async function(jobId, workerId, leaseDurationMs = 60000) {
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
      }
    }
  );
};

auditJobSchema.statics.getStaleProcessingJobs = function(jobType = null, now = new Date(), limit = 50) {
  const query = {
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

auditJobSchema.statics.getPendingJobs = function() {
  return this.find({
    status: { $in: ['queued', 'processing'] }
  }).sort({ priority: -1, queuedAt: 1 });
};

auditJobSchema.statics.getFailedJobs = function(jobType = null, limit = 50) {
  const query = {
    status: 'failed',
    $expr: { $lt: ['$retryCount', '$maxAttempts'] },
  };

  if (jobType) {
    query.jobType = jobType;
  }

  return this.find({
    ...query,
  }).sort({ retryAfter: 1 }).limit(limit);
};

auditJobSchema.statics.getJobsByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

auditJobSchema.statics.cleanupOldJobs = async function(daysOld = 30) {
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  
  return this.deleteMany({
    status: { $in: ['completed', 'failed', 'cancelled'] },
    completedAt: { $lt: cutoffDate }
  });
};

// Pre-save middleware
auditJobSchema.pre('save', function(next) {
  // Auto-calculate estimated duration based on job type
  if (this.isNew && !this.estimatedDuration) {
    this.estimatedDuration = this.jobType === 'full-audit' ? 300000 : 60000; // 5min or 1min
  }
  next();
});

const AuditJob = mongoose.model('AuditJob', auditJobSchema);

export default AuditJob;
