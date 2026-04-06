import test from 'node:test';
import assert from 'node:assert/strict';

import { extractSitemapLocs } from '../src/features/audits/internal-links.ts';

test('extractSitemapLocs reads page and nested sitemap URLs from XML loc tags', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
      <loc>https://example.com/sitemap-pages.xml</loc>
    </sitemap>
    <sitemap>
      <loc> https://example.com/pricing </loc>
    </sitemap>
  </sitemapindex>`;

  assert.deepEqual(extractSitemapLocs(xml), [
    'https://example.com/sitemap-pages.xml',
    'https://example.com/pricing',
  ]);
});
