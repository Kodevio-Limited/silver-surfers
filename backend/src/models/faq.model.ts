import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
);

faqSchema.index({ order: 1 });
faqSchema.index({ question: 1 }, { unique: false });

const FAQ = (mongoose.models.FAQ as mongoose.Model<unknown> | undefined)
  || mongoose.model('FAQ', faqSchema);

export default FAQ;
