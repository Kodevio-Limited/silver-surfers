import customConfig from './custom-config.js';
import { logger } from '../../../config/logger.ts';

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
  
  const categoryId = 'senior-friendly';
  const categoryConfig = (customConfig.categories as any)[categoryId];
  
  if (!categoryConfig) {
    scoringLogger.error(`'${categoryId}' category not found in config.`);
    return { finalScore: 0, totalWeightedScore: 0, totalWeight: 0, error: 'Category not found' };
  }

  const auditRefs = categoryConfig.auditRefs;
  const auditResults = report.audits;

  if (!auditRefs || auditRefs.length === 0) {
    scoringLogger.error('No audit references found in senior-friendly category');
    return { finalScore: 0, totalWeightedScore: 0, totalWeight: 0, error: 'No audit references' };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let processedAudits = 0;

  for (const auditRef of auditRefs) {
    const { id, weight } = auditRef;
    const result = auditResults[id];
    const score = result ? (result.score ?? 0) : 0;
    
    if (result) {
      processedAudits++;
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    scoringLogger.error('Total weight is 0 - cannot calculate score');
    return { finalScore: 0, totalWeightedScore: 0, totalWeight: 0, error: 'Zero total weight' };
  }

  const finalScore = (totalWeightedScore / totalWeight) * 100;
  scoringLogger.debug(`Final Silver Surfers Score: ${finalScore.toFixed(2)}`, {
    processedAudits,
    totalAudits: auditRefs.length,
    finalScore
  });
  
  return { finalScore, totalWeightedScore, totalWeight };
}
