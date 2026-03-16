import type { Model } from 'mongoose';

import BlogPost from '../../models/blog-post.model.ts';
import FAQ from '../../models/faq.model.ts';

interface BlogPostDocument {}
interface FaqDocument {}

interface BlogPostModel extends Model<BlogPostDocument> {}
interface FaqModel extends Model<FaqDocument> {}

export async function getBlogPostModel(): Promise<BlogPostModel> {
  return BlogPost as unknown as BlogPostModel;
}

export async function getFaqModel(): Promise<FaqModel> {
  return FAQ as unknown as FaqModel;
}
