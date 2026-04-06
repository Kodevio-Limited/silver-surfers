import axios from 'axios';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { logger } from '../../config/logger.ts';

const internalLinksLogger = logger.child('feature:audits:internal-links');
const NON_HTML_ASSET_PATTERN = /\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|exe|woff|woff2|ttf|xml)$/i;

export interface InternalLinksExtractionResult {
  success: boolean;
  links: string[];
  error?: string;
  details?: string;
}

export interface InternalLinksExtractorOptions {
  maxLinks?: number;
  maxDepth?: number;
  delayMs?: number;
  timeout?: number;
  maxRetries?: number;
}

export function extractSitemapLocs(xmlContent: string): string[] {
  const matches = String(xmlContent || '').matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi);
  return [...matches]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

export class InternalLinksExtractor {
  private config: Required<InternalLinksExtractorOptions>;
  private visited = new Set<string>();
  private results: Array<{ url: string; depth: number; source: string; error?: string }> = [];
  private baseOrigin: string | null = null;

  constructor(options: InternalLinksExtractorOptions = {}) {
    this.config = {
      maxLinks: options.maxLinks || 25,
      maxDepth: options.maxDepth || 2,
      delayMs: options.delayMs || 2000,
      timeout: options.timeout || 15000,
      maxRetries: options.maxRetries || 3,
    };
  }

  private async extractLinksWithPuppeteer(url: string): Promise<string[]> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: this.config.timeout 
      });

      const links = await page.evaluate(() => {
        const baseUrl = window.location.href;
        const origin = new URL(baseUrl).origin;
        const linkSet = new Set<string>();

        document.querySelectorAll('a[href]').forEach(anchor => {
          const href = anchor.getAttribute('href');
          if (!href) return;

          try {
            const fullUrl = new URL(href, baseUrl);
            if (fullUrl.origin !== origin) return;
            
            fullUrl.hash = '';
            fullUrl.search = '';
            
            const cleanUrl = fullUrl.href.replace(/\/$/, '');
            if (cleanUrl === origin) return;
            
            if (!/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|exe|woff|woff2|ttf|xml)$/i.test(cleanUrl)) {
              linkSet.add(cleanUrl);
            }
          } catch (e) { /* Skip invalid URLs */ }
        });

        return Array.from(linkSet);
      });

      return links;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async extractLinksWithCheerio(url: string): Promise<string[]> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: this.config.timeout,
    });

    const $ = cheerio.load(response.data);
    const origin = new URL(url).origin;
    const links = new Set<string>();

    $('a[href]').each((_i, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const fullUrl = new URL(href, url);
        if (fullUrl.origin !== origin) return;
        
        fullUrl.hash = '';
        fullUrl.search = '';
        
        const cleanUrl = fullUrl.href.replace(/\/$/, '');
        if (cleanUrl === origin) return;

        if (!/\.(css|js|png|jpg|jpeg|gif|svg|ico|pdf|zip|exe|woff|woff2|ttf|xml)$/i.test(cleanUrl)) {
          links.add(cleanUrl);
        }
      } catch (e) { /* Skip invalid URLs */ }
    });

    return Array.from(links);
  }

  private async extractLinksFromUrl(url: string): Promise<string[]> {
    internalLinksLogger.debug(`Extracting links from: ${url}`);
    
    try {
      const links = await this.extractLinksWithPuppeteer(url);
      internalLinksLogger.debug(`Found ${links.length} links via Puppeteer`);
      return links.filter(link => !this.visited.has(link));
    } catch (puppeteerError) {
      internalLinksLogger.debug('Puppeteer failed, trying Cheerio as a fallback...');
      try {
        const links = await this.extractLinksWithCheerio(url);
        internalLinksLogger.debug(`Found ${links.length} links via Cheerio`);
        return links.filter(link => !this.visited.has(link));
      } catch (cheerioError) {
        throw new Error(`Both Puppeteer and Cheerio failed to extract from ${url}.`);
      }
    }
  }

  private async attemptExtractionWithRetries(url: string): Promise<string[]> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.extractLinksFromUrl(url);
      } catch (error) {
        lastError = error;
        internalLinksLogger.warn(`Attempt ${attempt}/${this.config.maxRetries} failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
        if (attempt < this.config.maxRetries) {
          await this.delay();
        }
      }
    }
    throw lastError;
  }

  private async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.config.delayMs));
  }

  private normalizeInternalUrl(url: string): string | null {
    if (!this.baseOrigin) {
      return null;
    }

    try {
      const parsed = new URL(url, this.baseOrigin);
      if (parsed.origin !== this.baseOrigin) {
        return null;
      }

      parsed.hash = '';
      parsed.search = '';

      const normalized = parsed.href.replace(/\/$/, '');
      if (!normalized || normalized === this.baseOrigin || NON_HTML_ASSET_PATTERN.test(normalized)) {
        return null;
      }

      return normalized;
    } catch {
      return null;
    }
  }

  private async extractLinksFromSitemap(baseUrl: string): Promise<string[]> {
    const origin = new URL(baseUrl).origin;
    const sitemapQueue = [`${origin}/sitemap.xml`];
    const visitedSitemaps = new Set<string>();
    const results: string[] = [];

    while (sitemapQueue.length > 0 && visitedSitemaps.size < 5 && results.length < this.config.maxLinks) {
      const sitemapUrl = sitemapQueue.shift();
      if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) {
        continue;
      }

      visitedSitemaps.add(sitemapUrl);

      try {
        const response = await axios.get(sitemapUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SilverSurfersBot/1.0)',
            Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
          },
          timeout: this.config.timeout,
          responseType: 'text',
        });

        const locs = extractSitemapLocs(response.data);
        for (const loc of locs) {
          if (results.length >= this.config.maxLinks) {
            break;
          }

          const normalized = this.normalizeInternalUrl(loc);
          if (normalized) {
            results.push(normalized);
            continue;
          }

          try {
            const nested = new URL(loc, origin);
            if (nested.origin === origin && nested.pathname.toLowerCase().endsWith('.xml') && !visitedSitemaps.has(nested.href)) {
              sitemapQueue.push(nested.href);
            }
          } catch {
            // Ignore invalid nested sitemap locations.
          }
        }
      } catch (error) {
        internalLinksLogger.debug(`Sitemap fetch failed for ${sitemapUrl}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private async supplementResultsFromSitemap(baseUrl: string): Promise<void> {
    if (this.results.length >= this.config.maxLinks) {
      return;
    }

    const sitemapLinks = await this.extractLinksFromSitemap(baseUrl);
    let addedCount = 0;

    for (const link of sitemapLinks) {
      if (this.results.length >= this.config.maxLinks) {
        break;
      }

      if (this.visited.has(link)) {
        continue;
      }

      this.visited.add(link);
      this.results.push({ url: link, depth: 1, source: 'sitemap' });
      addedCount += 1;
    }

    if (addedCount > 0) {
      internalLinksLogger.info(`Supplemented internal links from sitemap.xml. Added ${addedCount} URLs.`);
    }
  }

  public async extractInternalLinks(baseUrl: string): Promise<InternalLinksExtractionResult> {
    try {
      internalLinksLogger.info(`Starting internal link extraction for: ${baseUrl}`, {
        maxLinks: this.config.maxLinks,
        maxDepth: this.config.maxDepth
      });

      this.baseOrigin = new URL(baseUrl).origin;
      this.visited.clear();
      this.results = [];

      this.visited.add(baseUrl);
      this.results.push({ url: baseUrl, depth: 0, source: 'initial' });

      let processIndex = 0;
      while (processIndex < this.results.length && this.results.length < this.config.maxLinks) {
        const currentItem = this.results[processIndex];
        const { url, depth } = currentItem!;

        internalLinksLogger.debug(`Processing #${processIndex + 1} (depth ${depth}): ${url}`);
        if (processIndex > 0) await this.delay();

        if (depth >= this.config.maxDepth) {
          internalLinksLogger.debug(`Max depth (${this.config.maxDepth}) reached. Skipping.`);
          processIndex++;
          continue;
        }

        try {
          const foundLinks = await this.attemptExtractionWithRetries(url);
          
          for (const link of foundLinks) {
            if (this.results.length >= this.config.maxLinks) break;
            if (!this.visited.has(link)) {
              this.visited.add(link);
              this.results.push({ url: link, depth: depth + 1, source: url });
            }
          }
        } catch (error) {
          internalLinksLogger.error(`Could not process ${url} after all retries:`, {
            error: error instanceof Error ? error.message : String(error)
          });
          currentItem!.error = error instanceof Error ? error.message : String(error);
          if (processIndex === 0) {
            throw new Error(`The base URL ${baseUrl} could not be processed. Aborting.`);
          }
        }
        
        processIndex++;
      }

      if (this.results.length < this.config.maxLinks) {
        await this.supplementResultsFromSitemap(baseUrl);
      }

      internalLinksLogger.info(`Extraction complete! Found a total of ${this.results.length} internal links.`);
      
      const finalLinks = this.results.map(item => item.url).slice(0, this.config.maxLinks);

      return {
        success: true,
        links: finalLinks
      };

    } catch (error) {
      internalLinksLogger.error('A critical error occurred during the extraction process:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        success: false,
        links: [],
        error: 'Failed to extract links due to a critical error.',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export async function extractInternalLinks(baseUrl: string, options: InternalLinksExtractorOptions = {}): Promise<InternalLinksExtractionResult> {
  const extractor = new InternalLinksExtractor(options);
  return await extractor.extractInternalLinks(baseUrl);
}
