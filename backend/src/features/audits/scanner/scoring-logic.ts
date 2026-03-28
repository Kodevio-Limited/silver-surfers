import { logger } from '../../../config/logger.ts';
import { buildAuditScorecard } from '../audit-scorecard.ts';

const scoringLogger = logger.child('feature:audits:scoring');

export interface ScoringResult {
  finalScore: number;
  totalWeightedScore: number;
  totalWeight: number;
  error?: string;
}

/**
 * Calculates the weighted "Senior Friendliness" score from a Lighthouse report
 */
export function calculateSeniorFriendlinessScore(report: any): ScoringResult {
  scoringLogger.debug('Starting Silver Surfers score calculation');
  const scorecard = buildAuditScorecard(report);
  const finalScore = scorecard.overallScore;

  scoringLogger.debug(`Final Silver Surfers Score: ${finalScore.toFixed(2)}`, {
    finalScore,
    primaryDimensions: scorecard.dimensions.length,
    evaluationDimensions: scorecard.evaluationDimensions.length,
  });

  return {
    finalScore,
    totalWeightedScore: finalScore,
    totalWeight: 100,
  };
}
