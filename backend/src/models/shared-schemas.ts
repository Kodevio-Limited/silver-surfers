import mongoose from 'mongoose';

export const auditIssueSchema = new mongoose.Schema({
  auditId: { type: String },
  title: { type: String },
  description: { type: String },
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  auditSourceType: { type: String, enum: ['wcag-aa', 'aging-heuristic', 'supporting-signal'], default: 'supporting-signal' },
  auditSourceLabel: { type: String, default: 'Supporting Signal' },
  wcagCriteria: { type: [String], default: [] },
  displayValue: { type: mongoose.Schema.Types.Mixed },
  sourceUrl: { type: String },
}, { _id: false });

export const dimensionScoreSchema = new mongoose.Schema({
  key: { type: String },
  label: { type: String },
  score: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  issueCount: { type: Number, default: 0 },
  topIssues: { type: [auditIssueSchema], default: [] },
}, { _id: false });

export const platformScoreSchema = new mongoose.Schema({
  key: { type: String },
  label: { type: String },
  score: { type: Number, default: 0 },
  pageCount: { type: Number, default: 0 },
}, { _id: false });

export const storedObjectSchema = new mongoose.Schema({
  filename: { type: String },
  key: { type: String },
  size: { type: Number },
  sizeMB: { type: String },
  fileId: { type: String },
  providerUrl: { type: String },
}, { _id: false });

export const reportFileSchema = new mongoose.Schema({
  id: { type: String },
  filename: { type: String },
  relativePath: { type: String },
  storageKey: { type: String },
  providerUrl: { type: String },
  size: { type: Number },
  sizeMB: { type: String },
  contentType: { type: String, default: 'application/pdf' },
}, { _id: false });

export const reportStorageSchema = new mongoose.Schema({
  provider: { type: String },
  bucket: { type: String },
  region: { type: String },
  prefix: { type: String },
  objectCount: { type: Number, default: 0 },
  signedUrlExpiresInSeconds: { type: Number },
  objects: { type: [storedObjectSchema], default: [] },
}, { _id: false });

export const aiReportSchema = new mongoose.Schema({
  status: { type: String, enum: ['generated', 'fallback'], default: 'fallback' },
  provider: { type: String, enum: ['openai', 'local'], default: 'local' },
  model: { type: String },
  generatedAt: { type: Date },
  headline: { type: String },
  summary: { type: String },
  businessImpact: { type: String },
  prioritySummary: { type: String },
  topRecommendations: { type: [String], default: [] },
  stakeholderNote: { type: String },
}, { _id: false });

export const scoreCardSchema = new mongoose.Schema({
  methodologyVersion: { type: String },
  categoryId: { type: String },
  overallScore: { type: Number, default: 0 },
  riskTier: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  scoreStatus: { type: String, enum: ['pass', 'needs-improvement', 'fail'], default: 'needs-improvement' },
  pageCount: { type: Number, default: 0 },
  evaluatedAt: { type: Date },
  dimensions: { type: [dimensionScoreSchema], default: [] },
  evaluationDimensions: { type: [dimensionScoreSchema], default: [] },
  topIssues: { type: [auditIssueSchema], default: [] },
  platforms: { type: [platformScoreSchema], default: [] },
}, { _id: false });
