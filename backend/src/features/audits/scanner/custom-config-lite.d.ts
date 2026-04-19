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

interface CustomConfigLite {
  extends: string;
  settings: {
    onlyCategories: string[];
  };
  artifacts: ArtifactEntry[];
  audits: AuditEntry[];
  categories: {
    'senior-friendly-lite': CategoryConfig;
  };
}

declare const customConfigLite: CustomConfigLite;
export default customConfigLite;
