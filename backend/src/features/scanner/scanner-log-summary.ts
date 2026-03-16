export interface ScannerChildLogSummary {
  stdoutLineCount: number;
  stdoutHighlights: string[];
  statusCount: number;
  lastStatus?: string;
  warningLines: string[];
}

const stdoutHighlightPatterns = [
  /^Launching Chrome\/Chromium from:/,
  /^✅ Chrome\/Chromium launched successfully/,
  /^✅ Chrome debugger is accessible/,
  /^✅ Loaded custom config/,
  /^✅ Custom config successfully loaded/,
  /^Running Lighthouse audit for /,
  /^✅ (Lite|Full|Hybrid)/,
  /^📊 Score:/,
  /^Lighthouse report saved to /,
];

const lighthouseStatusPattern = /^\d{4}-\d{2}-\d{2}T.*\bLH:status\b\s*/;

function splitLogLines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function summarizeScannerChildLogs(stdout: string, stderr: string): ScannerChildLogSummary {
  const stdoutLines = splitLogLines(stdout);
  const stderrLines = splitLogLines(stderr);

  const stdoutHighlights = stdoutLines.filter((line) => stdoutHighlightPatterns.some((pattern) => pattern.test(line)));
  const statusLines = stderrLines.filter((line) => lighthouseStatusPattern.test(line));
  const warningLines = stderrLines.filter((line) => !lighthouseStatusPattern.test(line));
  const lastStatusLine = statusLines.at(-1);

  return {
    stdoutLineCount: stdoutLines.length,
    stdoutHighlights,
    statusCount: statusLines.length,
    lastStatus: lastStatusLine ? lastStatusLine.replace(lighthouseStatusPattern, '') : undefined,
    warningLines,
  };
}
