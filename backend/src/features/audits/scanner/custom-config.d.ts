interface AuditRef {
  id: string;
  weight: number;
}

interface AuditEntry {
  path: string;
}

interface ArtifactEntry {
  id: string;
  gatherer: string;
}

interface CategoryConfig {
  title: string;
  description: string;
  auditRefs: AuditRef[];
}

interface CustomConfig {
  extends: string;
  settings: {
    onlyCategories: string[];
    maxWaitForLoad: number;
    throttlingMethod: string;
    disableStorageReset: boolean;
  };
  artifacts: ArtifactEntry[];
  audits: AuditEntry[];
  categories: {
    'senior-friendly': CategoryConfig;
  };
}

declare const customConfig: CustomConfig;
export default customConfig;
