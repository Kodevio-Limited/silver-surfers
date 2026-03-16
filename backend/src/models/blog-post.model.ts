import mongoose from 'mongoose';

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    category: { type: String, default: '' },
    author: { type: String, default: '' },
    date: { type: Date },
    readTime: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

blogPostSchema.index({ featured: 1, date: -1 });

const BlogPost = (mongoose.models.BlogPost as mongoose.Model<unknown> | undefined)
  || mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;
