import mongoose from 'mongoose';

const auditIssueSchema = new mongoose.Schema({
  auditId: { type: String },
  title: { type: String },
  description: { type: String },
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  displayValue: { type: mongoose.Schema.Types.Mixed },
  sourceUrl: { type: String }
}, { _id: false });

const dimensionScoreSchema = new mongoose.Schema({
  key: { type: String },
  label: { type: String },
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  issueCount: { type: Number, default: 0 },
  topIssues: { type: [auditIssueSchema], default: [] }
}, { _id: false });

const platformScoreSchema = new mongoose.Schema({
  key: { type: String },
  label: { type: String },
  score: { type: Number, default: 0 },
  pageCount: { type: Number, default: 0 }
}, { _id: false });

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

const scoreCardSchema = new mongoose.Schema({
  methodologyVersion: { type: String },
  categoryId: { type: String },
  overallScore: { type: Number, default: 0 },
  riskTier: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  scoreStatus: { type: String, enum: ['pass', 'needs-improvement', 'fail'], default: 'needs-improvement' },
  pageCount: { type: Number, default: 0 },
  evaluatedAt: { type: Date },
  dimensions: { type: [dimensionScoreSchema], default: [] },
  topIssues: { type: [auditIssueSchema], default: [] },
  platforms: { type: [platformScoreSchema], default: [] }
}, { _id: false });

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
  score: { type: Number, default: null }, // Accessibility score percentage (0-100)
  scoreCard: { type: scoreCardSchema, default: undefined },
  status: { type: String, enum: ['queued','processing','completed','failed'], default: 'queued' },
  emailStatus: { type: String, enum: ['pending','sending','sent','failed'], default: 'pending' },
  reportDirectory: { type: String },
  reportStorage: { type: reportStorageSchema, default: undefined },
  emailError: { type: String },
  emailAccepted: { type: [String], default: [] },
  emailRejected: { type: [String], default: [] },
  attachmentCount: { type: Number, default: 0 },
  failureReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

analysisRecordSchema.index({ email: 1, createdAt: -1 });
analysisRecordSchema.index({ user: 1, createdAt: -1 });

analysisRecordSchema.pre('save', function(next){
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('AnalysisRecord', analysisRecordSchema);
