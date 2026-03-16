import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    subject: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['new', 'read', 'closed'], default: 'new' },
  },
  { timestamps: true },
);

contactMessageSchema.index({ status: 1, createdAt: -1 });

const ContactMessage = (mongoose.models.ContactMessage as mongoose.Model<unknown> | undefined)
  || mongoose.model('ContactMessage', contactMessageSchema);

export default ContactMessage;
