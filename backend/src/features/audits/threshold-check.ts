interface ScoreEntry {
  Url?: string;
  score?: number | string;
}

interface StrategyResult {
  score: number;
  explanation: string;
}

interface ScoreStrategy {
  name: string;
  requirements: (averages: Map<number, number>, allScores: number[]) => boolean;
  calculate: (averages: Map<number, number>, allScores: number[]) => StrategyResult;
  reason: (averages: Map<number, number>) => string;
}

const calculationStrategies: ScoreStrategy[] = [
  {
    name: 'Preferred: 60% base + 40% level-1',
    requirements: (averages) => averages.has(0) && averages.has(1),
    calculate: (averages) => {
      const baseAvg = averages.get(0) || 0;
      const level1Avg = averages.get(1) || 0;
      return {
        score: (baseAvg * 0.6) + (level1Avg * 0.4),
        explanation: `Calculation: (${baseAvg.toFixed(2)} * 0.6) + (${level1Avg.toFixed(2)} * 0.4)`,
      };
    },
    reason: (averages) => {
      if (!averages.has(0)) {
        return 'Missing data for Base URLs (level 0).';
      }

      if (!averages.has(1)) {
        return 'Missing data for Level-1 URLs.';
      }

      return 'An unknown error occurred.';
    },
  },
  {
    name: 'Fallback: 60% base + 40% level-2',
    requirements: (averages) => averages.has(0) && averages.has(2),
    calculate: (averages) => {
      const baseAvg = averages.get(0) || 0;
      const level2Avg = averages.get(2) || 0;
      return {
        score: (baseAvg * 0.6) + (level2Avg * 0.4),
        explanation: `Calculation: (${baseAvg.toFixed(2)} * 0.6) + (${level2Avg.toFixed(2)} * 0.4)`,
      };
    },
    reason: (averages) => {
      if (!averages.has(0)) {
        return 'Missing data for Base URLs (level 0).';
      }

      if (!averages.has(2)) {
        return 'Missing data for Level-2 URLs.';
      }

      return 'An unknown error occurred.';
    },
  },
  {
    name: 'Base URLs only',
    requirements: (averages) => averages.has(0),
    calculate: (averages) => {
      const baseAvg = averages.get(0) || 0;
      return {
        score: baseAvg,
        explanation: 'Calculation: Using the average score of Base URLs directly.',
      };
    },
    reason: () => 'Missing data for Base URLs (level 0).',
  },
  {
    name: 'Level-1 URLs only',
    requirements: (averages) => averages.has(1),
    calculate: (averages) => {
      const level1Avg = averages.get(1) || 0;
      return {
        score: level1Avg,
        explanation: 'Calculation: Using the average score of Level-1 URLs directly.',
      };
    },
    reason: () => 'Missing data for Level-1 URLs.',
  },
  {
    name: 'Level-2 URLs only',
    requirements: (averages) => averages.has(2),
    calculate: (averages) => {
      const level2Avg = averages.get(2) || 0;
      return {
        score: level2Avg,
        explanation: 'Calculation: Using the average score of Level-2 URLs directly.',
      };
    },
    reason: () => 'Missing data for Level-2 URLs.',
  },
  {
    name: 'Overall average of all URLs',
    requirements: (_averages, allScores) => allScores.length > 0,
    calculate: (_averages, allScores) => {
      const total = allScores.reduce((sum, score) => sum + score, 0);
      return {
        score: total / allScores.length,
        explanation: `Calculation: Averaging all ${allScores.length} available scores.`,
      };
    },
    reason: () => 'No valid URLs with scores were found in the provided data.',
  },
];

function parseUrl(urlString: string): { childLevel: number } | null {
  try {
    const url = new URL(urlString);
    const pathSegments = url.pathname.split('/').filter((segment) => segment.length > 0);
    return {
      childLevel: pathSegments.length,
    };
  } catch {
    return null;
  }
}

export function calculateWeightedScore(
  data: ScoreEntry[],
  options: { verbose?: boolean } = {},
): {
  finalScore: number;
  method: string;
  breakdown: {
    baseAvg: number | null;
    level1Avg: number | null;
    level2Avg: number | null;
    counts: {
      base: number;
      level1: number;
      level2: number;
      other: number;
    };
  };
} {
  const { verbose = false } = options;
  const groupedByLevel = new Map<number, number[]>();
  const allScores: number[] = [];

  for (const entry of data) {
    const parsed = parseUrl(String(entry.Url || ''));
    if (!parsed) {
      if (verbose) {
        console.log(`  - Skipping invalid URL: "${String(entry.Url || '')}"`);
      }
      continue;
    }

    const score = Number.parseFloat(String(entry.score));
    if (!Number.isFinite(score)) {
      if (verbose) {
        console.log(`  - Skipping non-numeric score for URL: "${String(entry.Url || '')}"`);
      }
      continue;
    }

    const scoresForLevel = groupedByLevel.get(parsed.childLevel) || [];
    scoresForLevel.push(score);
    groupedByLevel.set(parsed.childLevel, scoresForLevel);
    allScores.push(score);
  }

  const averageScores = new Map<number, number>();
  for (const [level, scores] of groupedByLevel.entries()) {
    const total = scores.reduce((sum, score) => sum + score, 0);
    averageScores.set(level, total / scores.length);
  }

  let finalScore = 0;
  let method = 'No valid calculation method found';

  for (const strategy of calculationStrategies) {
    if (strategy.requirements(averageScores, allScores)) {
      const result = strategy.calculate(averageScores, allScores);
      finalScore = result.score;
      method = strategy.name;
      if (verbose) {
        console.log(result.explanation);
      }
      break;
    }
  }

  const getAverage = (level: number): number | null => averageScores.get(level) || null;
  const getCount = (level: number): number => groupedByLevel.get(level)?.length || 0;

  return {
    finalScore,
    method,
    breakdown: {
      baseAvg: getAverage(0),
      level1Avg: getAverage(1),
      level2Avg: getAverage(2),
      counts: {
        base: getCount(0),
        level1: getCount(1),
        level2: getCount(2),
        other: allScores.length - (getCount(0) + getCount(1) + getCount(2)),
      },
    },
  };
}

export function checkScoreThreshold(
  data: ScoreEntry[],
  threshold: number = 80,
  options: { verbose?: boolean } = {},
): {
  pass: boolean;
  score: number;
  threshold: number;
  method: string;
  breakdown: ReturnType<typeof calculateWeightedScore>['breakdown'];
} {
  if (threshold < 0 || threshold > 100) {
    throw new Error('Threshold must be between 0 and 100');
  }

  const result = calculateWeightedScore(data, options);
  return {
    pass: result.finalScore >= threshold,
    score: result.finalScore,
    threshold,
    method: result.method,
    breakdown: result.breakdown,
  };
}
