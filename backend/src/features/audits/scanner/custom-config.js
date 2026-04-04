import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  extends: 'lighthouse:default',

  settings: {
    onlyCategories: ['senior-friendly'],
    maxWaitForLoad: 120000,
    throttlingMethod: 'simulate',
    disableStorageReset: true,
  },

  artifacts: [
    { id: 'PageText', gatherer: path.resolve(__dirname, 'gatherers/text-gatherer.js') },
    { id: 'PageLinkColors', gatherer: path.resolve(__dirname, 'gatherers/color-gatherer.js') },
    { id: 'BrittleLayoutElements', gatherer: path.resolve(__dirname, 'gatherers/layout-gatherer.js') },
    { id: 'PageContentGatherer', gatherer: path.resolve(__dirname, 'gatherers/page-content-gatherer.js') },
    { id: 'AutoplayMedia', gatherer: path.resolve(__dirname, 'gatherers/autoplay-gatherer.js') },
  ],

  audits: [
    { path: path.resolve(__dirname, 'audits/text-audit.js') },
    { path: path.resolve(__dirname, 'audits/color-audit.js') },
    { path: path.resolve(__dirname, 'audits/layout-audit.js') },
    { path: path.resolve(__dirname, 'audits/flesch-kincaid-audit.js') },
    { path: path.resolve(__dirname, 'audits/line-spacing-audit.js') },
    { path: path.resolve(__dirname, 'audits/autoplay-audit.js') },
  ],

  categories: {
    'senior-friendly': {
      title: 'Senior Friendliness',
      description: 'A comprehensive score based on audits for readability, ease of use, and a stable, non-confusing experience.',
      auditRefs: [
        { id: 'color-contrast', weight: 10 },
        { id: 'target-size', weight: 10 },
        { id: 'viewport', weight: 10 },
        { id: 'cumulative-layout-shift', weight: 10 },
        { id: 'text-font-audit', weight: 15 },
        { id: 'layout-brittle-audit', weight: 2 },
        { id: 'flesch-kincaid-audit', weight: 15 },
        { id: 'largest-contentful-paint', weight: 5 },
        { id: 'total-blocking-time', weight: 5 },
        { id: 'link-name', weight: 5 },
        { id: 'button-name', weight: 5 },
        { id: 'label', weight: 5 },
        { id: 'interactive-color-audit', weight: 5 },
        { id: 'is-on-https', weight: 2 },
        { id: 'dom-size', weight: 2 },
        { id: 'heading-order', weight: 2 },
        { id: 'errors-in-console', weight: 2 },
        { id: 'geolocation-on-start', weight: 2 },
        { id: 'image-alt', weight: 5 },
        { id: 'focus-traps', weight: 4 },
        { id: 'bypass', weight: 3 },
        { id: 'line-spacing-audit', weight: 5 },
        { id: 'autoplay-audit', weight: 3 },
      ],
    },
  },
};
