import { Router } from 'express';

import { asyncHandler } from '../../shared/http/async-handler.ts';
import { getBlogPostModel, getFaqModel } from './content.dependencies.ts';

const router = Router();

router.get('/blogs', asyncHandler(async (request, response) => {
  const BlogPost = await getBlogPostModel();
  const publishedOnly = request.query.published !== 'false';
  const query = publishedOnly ? { published: true } : {};
  const items = await BlogPost.find(query).sort({ createdAt: -1 }).lean();
  response.json({ items });
}));

router.get('/blogs/:slug', asyncHandler(async (request, response) => {
  const BlogPost = await getBlogPostModel();
  const publishedOnly = request.query.published !== 'false';
  const query: Record<string, unknown> = { slug: request.params.slug };

  if (publishedOnly) {
    query.published = true;
  }

  const post = await BlogPost.findOne(query).lean();
  if (!post) {
    response.status(404).json({ error: 'Blog post not found' });
    return;
  }

  response.json({ post });
}));

router.get('/faqs', asyncHandler(async (request, response) => {
  const FAQ = await getFaqModel();
  const publishedOnly = request.query.published !== 'false';
  const query = publishedOnly ? { published: true } : {};
  const items = await FAQ.find(query).sort({ order: 1, createdAt: -1 }).lean();
  response.json({ items });
}));

export default router;
