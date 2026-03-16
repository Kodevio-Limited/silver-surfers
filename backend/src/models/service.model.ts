import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    priceCents: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Service = (mongoose.models.Service as mongoose.Model<unknown> | undefined)
  || mongoose.model('Service', serviceSchema);

export default Service;
