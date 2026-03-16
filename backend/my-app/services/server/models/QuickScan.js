import mongoose from 'mongoose';

const storedObjectSchema = new mongoose.Schema({
  filename: {
    type: String
  },
  key: {
    type: String
  },
  size: {
    type: Number
  },
  sizeMB: {
    type: String
  },
  fileId: {
    type: String
  },
  providerUrl: {
    type: String
  }
}, { _id: false });

const reportStorageSchema = new mongoose.Schema({
  provider: {
    type: String
  },
  bucket: {
    type: String
  },
  region: {
    type: String
  },
  prefix: {
    type: String
  },
  objectCount: {
    type: Number,
    default: 0
  },
  signedUrlExpiresInSeconds: {
    type: Number
  },
  objects: {
    type: [storedObjectSchema],
    default: []
  }
}, { _id: false });

const quickScanSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  scanScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  scanDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },
  reportGenerated: {
    type: Boolean,
    default: false
  },
  reportPath: {
    type: String,
    default: null
  },
  reportStorage: {
    type: reportStorageSchema,
    default: undefined
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
quickScanSchema.index({ email: 1, scanDate: -1 });
quickScanSchema.index({ url: 1 });
quickScanSchema.index({ scanDate: -1 });

const QuickScan = mongoose.model('QuickScan', quickScanSchema);

export default QuickScan;
