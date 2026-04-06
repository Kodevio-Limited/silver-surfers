import { Audit } from 'lighthouse';
import { calculateFleschKincaid } from './flesch-kincaid-audit-helpers.js';
import { classifyWebsiteCategory } from './category-classifier.js';

class FleschKincaidAudit extends Audit {
  static get meta() {
    return {
      id: 'flesch-kincaid-audit',
      title: 'Flesch-Kincaid Reading Ease (Older Adult-Adjusted)',
      failureTitle: 'Text is difficult to read for older adult users',
      description: 'Calculates the Flesch-Kincaid reading ease score with category-based adjustments for older adult users. Scores are adjusted based on website category expectations.',
      requiredArtifacts: ['PageText'],
    };
  }
  
  static async audit(artifacts) {
    const collectedTextFragments = (artifacts.PageText || []).map((item) => item.text);
    if (!collectedTextFragments || collectedTextFragments.length === 0) {
      return { score: 1, notApplicable: true };
    }
    
    const result = calculateFleschKincaid(collectedTextFragments);
    const { score: rawScore, words, sentences, syllables, debug } = result;
    
    let categoryData;
    try {
      categoryData = await classifyWebsiteCategory(collectedTextFragments);
    } catch (error) {
      categoryData = {
        category: 'General',
        adjustment: 0,
        threshold: { min: 60, max: 70 },
        rationale: 'Standard readability expectations',
        confidence: 'N/A'
      };
    }
    
    const detectedCategory = categoryData.category;
    const categoryAdjustment = categoryData.adjustment;
    const categoryRationale = categoryData.rationale;
    const categoryConfidence = categoryData.confidence || 'N/A';
    
    const adjustedScore = rawScore + categoryAdjustment;
    const { min: minThreshold, max: maxThreshold } = categoryData.threshold;
    
    let suitabilityRating;
    if (adjustedScore >= maxThreshold) {
      suitabilityRating = 'Excellent';
    } else if (adjustedScore >= minThreshold) {
      suitabilityRating = 'Good';
    } else if (adjustedScore >= minThreshold - 10) {
      suitabilityRating = 'Moderately Suitable';
    } else {
      suitabilityRating = 'Needs Improvement';
    }
    
    let lighthouseScore;
    const hasMinimalContent = words >= 30 && debug.contentQuality !== 'none';
    
    if (!hasMinimalContent) {
      lighthouseScore = 0;
    } else {
      if (adjustedScore >= maxThreshold) {
        lighthouseScore = 1.0;
      } else if (adjustedScore >= minThreshold) {
        const range = maxThreshold - minThreshold;
        const position = adjustedScore - minThreshold;
        lighthouseScore = 0.80 + (position / range) * 0.19;
      } else if (adjustedScore >= minThreshold - 10) {
        const position = adjustedScore - (minThreshold - 10);
        lighthouseScore = 0.50 + (position / 10) * 0.29;
      } else if (adjustedScore >= 30) {
        const position = adjustedScore - 30;
        const range = (minThreshold - 10) - 30;
        lighthouseScore = 0.20 + (position / range) * 0.29;
      } else {
        lighthouseScore = Math.max(0, adjustedScore / 30 * 0.19);
      }
      
      lighthouseScore = Math.round(lighthouseScore * 100) / 100;
    }
    
    const headings = [
      { key: 'metric', itemType: 'text', text: 'Metric' },
      { key: 'value', itemType: 'text', text: 'Value' },
    ];
    
    const items = [
      { metric: 'Website Category', value: `${detectedCategory}` },
      { metric: 'Confidence Level', value: categoryConfidence },
      { metric: 'Raw Flesch-Kincaid Score', value: rawScore.toString() },
      { metric: 'Category Adjustment', value: `+${categoryAdjustment}` },
      { metric: 'Adjusted Score (Elderly)', value: adjustedScore.toString() },
      { metric: 'Elderly-Suitable Range', value: `${minThreshold}–${maxThreshold}` },
      { metric: 'Suitability Rating', value: `${suitabilityRating}` },
      { metric: 'Lighthouse Score', value: `${(lighthouseScore * 100).toFixed(0)}%` },
      { metric: 'Adjustment Rationale', value: categoryRationale },
      { metric: 'Content Quality', value: debug.contentQuality },
      { metric: 'Content Sentences Analyzed', value: sentences.toString() },
      { metric: 'Total Words', value: words.toString() },
      { metric: 'Total Syllables', value: syllables.toString() },
      { metric: 'Avg Words/Sentence', value: debug.avgWordsPerSentence.toString() },
      { metric: 'Avg Syllables/Word', value: debug.avgSyllablesPerWord.toString() },
      { metric: 'Sample Sentences (First 3)', value: debug.sentenceList.slice(0, 3).join(' | ') },
    ];
    
    return {
      score: lighthouseScore,
      numericValue: adjustedScore,
      numericUnit: 'adjusted-score',
      displayValue: `${detectedCategory} | Score: ${adjustedScore} | ${suitabilityRating}`,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

export default FleschKincaidAudit;
