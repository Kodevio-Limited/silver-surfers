import fs from 'node:fs/promises';
import path from 'node:path';

import lighthouse from 'lighthouse';
import puppeteer, { KnownDevices } from 'puppeteer';

import customConfig from '../src/features/audits/scanner/custom-config.js';
import customConfigLite from '../src/features/audits/scanner/custom-config-lite.js';

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function normalizeUrl(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) {
    throw new Error('URL is required.');
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getDeviceProfile(device) {
  if (device === 'mobile') {
    return {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        disabled: false,
      },
      emulate: async (page) => page.emulate(KnownDevices['Pixel 5']),
    };
  }

  if (device === 'tablet') {
    return {
      formFactor: 'mobile',
      screenEmulation: {
        mobile: true,
        width: 834,
        height: 1194,
        deviceScaleFactor: 2,
        disabled: false,
      },
      emulate: async (page) => page.emulate(KnownDevices['iPad Pro 11']),
    };
  }

  return {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false,
    },
    emulate: async (page) => page.setViewport({ width: 1350, height: 940, deviceScaleFactor: 1 }),
  };
}

async function main() {
  const [, , rawUrl, reportPathArg, deviceArg = 'desktop', liteArg = 'false', browserWSEndpoint] = process.argv;

  if (!rawUrl) {
    throw new Error('URL argument is required.');
  }

  if (!reportPathArg) {
    throw new Error('Report path argument is required.');
  }

  if (!browserWSEndpoint) {
    throw new Error('Browser websocket endpoint argument is required.');
  }

  const url = normalizeUrl(rawUrl);
  const reportPath = path.resolve(reportPathArg);
  const device = ['desktop', 'mobile', 'tablet'].includes(deviceArg) ? deviceArg : 'desktop';
  const isLiteVersion = parseBoolean(liteArg);
  const version = isLiteVersion ? 'Lite' : 'Full';
  const config = isLiteVersion ? customConfigLite : customConfig;
  const deviceProfile = getDeviceProfile(device);

  console.log(`Running Lighthouse audit for ${url}`);
  console.log(`✅ Loaded custom config (${version})`);

  const browser = await puppeteer.connect({ browserWSEndpoint });
  console.log('✅ Chrome debugger is accessible');

  let page;

  try {
    page = await browser.newPage();
    await deviceProfile.emulate(page);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60_000,
    });
    await page.waitForSelector('body', { timeout: 10_000 });

    const port = Number(new URL(browser.wsEndpoint()).port);
    const flags = {
      output: 'json',
      logLevel: 'info',
      port,
      formFactor: deviceProfile.formFactor,
      screenEmulation: deviceProfile.screenEmulation,
    };

    const result = await lighthouse(url, flags, config);
    if (!result?.lhr) {
      throw new Error('Lighthouse did not return an LHR payload.');
    }

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(result.lhr, null, 2), 'utf8');

    const categoryId = isLiteVersion ? 'senior-friendly-lite' : 'senior-friendly';
    const score = result.lhr.categories?.[categoryId]?.score;

    console.log(`✅ ${version} audit completed successfully`);
    if (typeof score === 'number') {
      console.log(`📊 Score: ${Math.round(score * 10000) / 100}%`);
    }
    console.log(`Lighthouse report saved to ${reportPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Lighthouse error: ${message}`);
    throw error;
  } finally {
    await page?.close().catch(() => undefined);
    await browser.disconnect();
  }
}

main().catch(() => {
  process.exitCode = 1;
});
