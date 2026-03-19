import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  extends: 'lighthouse:default',
  
  settings: {
    onlyCategories: ['senior-friendly-lite'],
  },
  
  artifacts: [
    { id: 'PageText', gatherer: path.resolve(__dirname, 'gatherers/text-gatherer.js') },
  ],
  
  audits: [
    { path: path.resolve(__dirname, 'audits/text-audit.js') },
  ],
  
  categories: {
    'senior-friendly-lite': {
      title: 'Senior Accessibility (Lite)',
      description: 'Essential accessibility checks for senior users using built-in Lighthouse audits plus custom font analysis.',
      
      auditRefs: [
        { id: 'color-contrast', weight: 5 },
        { id: 'target-size', weight: 5 },
        { id: 'text-font-audit', weight: 5 },
        { id: 'viewport', weight: 3 },
        { id: 'link-name', weight: 3 },
        { id: 'button-name', weight: 3 },
        { id: 'label', weight: 3 },
        { id: 'heading-order', weight: 2 },
        { id: 'is-on-https', weight: 2 },
        { id: 'largest-contentful-paint', weight: 1 },
        { id: 'cumulative-layout-shift', weight: 1 },
      ],
    },
  },
};
