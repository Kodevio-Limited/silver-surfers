import test from 'node:test';
import assert from 'node:assert/strict';

import { getBlogPostModel, getFaqModel } from '../src/features/content/content.dependencies.ts';

test('content dependencies resolve native TypeScript models', async () => {
  const [blogPostModel, faqModel] = await Promise.all([
    getBlogPostModel(),
    getFaqModel(),
  ]);

  assert.equal(blogPostModel.modelName, 'BlogPost');
  assert.equal(faqModel.modelName, 'FAQ');
});
