import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../../../');
dotenv.config({ path: path.join(rootDir, '.env') });

export async function classifyWebsiteCategory(textFragments) {
    if (!process.env.JINA_API_KEY) {
        return getFallbackResponse('Missing API Key');
    }

    const sampleText = textFragments
        .slice(0, 5)
        .join(' ')
        .substring(0, 500);

    const labels = [
        "Healthcare Medical", "Government Legal", "Financial Banking",
        "E-commerce Retail", "News Media", "Educational",
        "Entertainment Leisure", "Insurance", "Technology SaaS",
        "Utilities Services", "Travel Hospitality", "Non-profit Community"
    ];

    try {
        const response = await axios.post('https://api.jina.ai/v1/classify', {
            model: "jina-embeddings-v3",
            input: [sampleText],
            labels: labels
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
            }
        });

        const predictions = response.data?.data?.[0]?.predictions;

        if (predictions && predictions.length > 0) {
            predictions.sort((a, b) => b.score - a.score);

            const detectedCategory = predictions[0].label;
            const confidenceScore = `${(predictions[0].score * 100).toFixed(1)}%`;
            const categoryData = getCategoryAdjustment(detectedCategory);

            return {
                category: detectedCategory,
                adjustment: categoryData.adjustment,
                threshold: categoryData.threshold,
                rationale: categoryData.rationale,
                confidence: confidenceScore,
                jinaAccessible: true
            };
        } else {
            return getFallbackResponse('No predictions returned');
        }
    } catch (error) {
        return getFallbackResponse(error instanceof Error ? error.message : String(error));
    }
}

function getFallbackResponse(reason) {
  return {
    category: 'General',
    adjustment: 0,
    threshold: { min: 60, max: 70 },
    rationale: `Standard readability expectations (${reason} fallback)`,
    confidence: 'N/A',
    jinaAccessible: false
  };
}

function getCategoryAdjustment(category) {
  const adjustments = {
    'Healthcare Medical': { adjustment: 15, threshold: { min: 45, max: 60 }, rationale: 'Medical terminology density increases sentence difficulty' },
    'Government Legal': { adjustment: 12, threshold: { min: 48, max: 62 }, rationale: 'Legalese and statutory references are unavoidable' },
    'Financial Banking': { adjustment: 10, threshold: { min: 50, max: 65 }, rationale: 'Financial jargon is domain-specific' },
    'E-commerce Retail': { adjustment: 5, threshold: { min: 55, max: 70 }, rationale: 'Product specs use technical descriptors' },
    'News Media': { adjustment: 8, threshold: { min: 52, max: 68 }, rationale: 'Specialized reporting terms' },
    'Educational': { adjustment: 7, threshold: { min: 53, max: 70 }, rationale: 'Academic vocabulary is inherent' },
    'Entertainment Leisure': { adjustment: 3, threshold: { min: 57, max: 75 }, rationale: 'Should be easily accessible' },
    'Insurance': { adjustment: 12, threshold: { min: 48, max: 62 }, rationale: 'Policy language is legally required' },
    'Technology SaaS': { adjustment: 8, threshold: { min: 52, max: 68 }, rationale: 'Technical specifications are inherent' },
    'Utilities Services': { adjustment: 6, threshold: { min: 54, max: 70 }, rationale: 'Service terms add complexity' },
    'Travel Hospitality': { adjustment: 5, threshold: { min: 55, max: 72 }, rationale: 'Booking details use specialized language' },
    'Non-profit Community': { adjustment: 4, threshold: { min: 56, max: 73 }, rationale: 'Mission statements use advocacy terms' },
  };

  return adjustments[category] || {
    adjustment: 0,
    threshold: { min: 60, max: 70 },
    rationale: 'Standard readability expectations'
  };
}
