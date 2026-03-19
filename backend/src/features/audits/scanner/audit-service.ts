import fs from 'fs/promises';
import { URL } from 'url';
import path from 'path';
import os from 'os';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-extra';
import { KnownDevices, Browser, Page } from 'puppeteer';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import customConfig from './custom-config.js';
import customConfigLite from './custom-config-lite.js';
import { logger } from '../../../config/logger.ts';

const auditLogger = logger.child('feature:audits:scanner');

// Use stealth plugin
(puppeteer as any).use(stealthPlugin());

export interface AuditOptions {
  url: string;
  device?: 'desktop' | 'mobile' | 'tablet';
  format?: 'json' | 'html';
  isLiteVersion?: boolean;
}

export interface AuditResult {
  success: boolean;
  reportPath?: string;
  report?: any;
  error?: string;
  errorCode?: string;
  url?: string;
  device?: string;
  strategy?: string;
  scoreData?: any;
}

/**
 * Audit Service using Node.js + Lighthouse + Puppeteer
 */
export class AuditService {
  private static browser: Browser | null = null;

  /**
   * Get or create a browser instance (Simple Pooling)
   */
  private static async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    auditLogger.info('Launching new browser instance for pooling');
    this.browser = await (puppeteer as any).launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    return this.browser!;
  }

  /**
   * Block unnecessary resources for speed
   */
  private static async setupPage(page: Page): Promise<void> {
    await (page as any).setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        // We block images/media but KEEP stylesheets and fonts as they affect Lighthouse audits (CLS, FCP, Accessibility)
        // Actually, for accessibility, we might need fonts. 
        // Let's only block media/images if we want speed, but Lighthouse might complain if the page looks broken.
        if (['media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      } else {
        request.continue();
      }
    });

    // Anti-detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  /**
   * Run the audit
   */
  public static async runAudit(options: AuditOptions): Promise<AuditResult> {
    const { url, device = 'desktop', format = 'json', isLiteVersion = false } = options;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    auditLogger.info(`Starting audit for ${fullUrl}`, { device, isLiteVersion });

    let page: Page | null = null;
    let browser: Browser | null = null;

    try {
      browser = await this.getBrowser();
      page = await browser.newPage();

      // Configure device emulation
      if (device === 'mobile') {
        await page.emulate(KnownDevices['Pixel 5']);
      } else if (device === 'tablet') {
        await page.emulate(KnownDevices['iPad Pro 11']);
      } else {
        await page.setViewport({ width: 1280, height: 800 });
      }

      await this.setupPage(page);

      auditLogger.debug(`Navigating to ${fullUrl}`);
      const response = await page.goto(fullUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response?.status() || 'Unknown status'}`);
      }

      // Wait for content
      await page.waitForSelector('body', { timeout: 10000 });

      const config = isLiteVersion ? customConfigLite : customConfig;
      
      auditLogger.debug('Running Lighthouse');
      const lhResult = await lighthouse(fullUrl, {
        output: format,
        logLevel: 'info',
        port: (new URL(browser.wsEndpoint())).port as any, // Lighthouse needs the port
      }, config);

      if (!lhResult || !lhResult.lhr) {
        throw new Error('Lighthouse failed to generate a report');
      }

      const report = format === 'json' ? JSON.stringify(lhResult.lhr, null, 2) : lhResult.report;
      
      const urlObj = new URL(fullUrl);
      const hostname = urlObj.hostname.replace(/\./g, '-');
      const timestamp = Date.now();
      const reportFilename = `report-${hostname}-${timestamp}.${format}`;
      const reportPath = path.join(os.tmpdir(), reportFilename);

      await fs.writeFile(reportPath, report);
      
      return {
        success: true,
        reportPath,
        report: lhResult.lhr,
        url: fullUrl,
        device,
        strategy: 'Node-Lighthouse-Integrated'
      };

    } catch (error: any) {
      auditLogger.error(`Audit failed for ${fullUrl}`, { error: error.message });
      return {
        success: false,
        error: error.message,
        errorCode: 'AUDIT_FAILED'
      };
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
    }
  }
}

export async function runLighthouseAudit(options: AuditOptions): Promise<AuditResult> {
  return await AuditService.runAudit(options);
}
