export interface LiteAccessibilityReportResult {
  reportPath: string;
  score: string | number;
}

export function generateLiteAccessibilityReport(
  inputFile: string,
  outputDirectory: string,
): Promise<LiteAccessibilityReportResult>;
