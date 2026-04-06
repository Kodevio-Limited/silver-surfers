import nlp from 'compromise';

function countSyllables(word) {
  if (word.length <= 3) return 1;
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 1;
  word = word.replace(/e$/, '');
  const vowelMatches = word.match(/[aeiouy]+/g);
  return vowelMatches ? vowelMatches.length : 1;
}

function preProcessSentence(sentence) {
    let cleaned = sentence.replace(/\s*\.{1,}\s*.*$/, '.');
    const cruftRegex = /\b(learn more|read more|click here|get started|accept|to know more)\b\.?$/i;
    cleaned = cleaned.replace(cruftRegex, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim().replace(/^[.,\s]+|[.,\s]+$/g, '');
    return cleaned;
}

function isContentSentence(sentence) {
    const doc = nlp(sentence);
    const words = doc.terms().json().map((t) => t.text);
    if (words.length < 5) return false;
    const junkRegex = /\b(all rights reserved|privacy policy|cookie policy|log in|sign up|specialty-focused)\b/i;
    if (junkRegex.test(sentence)) return false;
    if (!doc.has('#Noun') || !doc.has('#Verb')) return false;
    const terms = doc.json(0).terms;
    const nonVerbCount = terms.filter((t) => t.tags.includes('Noun') || t.tags.includes('Adjective')).length;
    if (!doc.has('#Verb') && (nonVerbCount / terms.length) > 0.7) return false;
    const firstTerm = doc.terms().first();
    if (firstTerm.has('#Verb') && !doc.match('#Noun').before(firstTerm).found) return false;
    return true;
}

function isCompleteSentence(sentence) {
    return /[.!?]$/.test(sentence.trim());
}

function getBestSampleSentences(sentences, count = 3) {
    if (sentences.length === 0) return [];
    const completeSentences = sentences.filter(isCompleteSentence);
    const incompleteSentences = sentences.filter(s => !isCompleteSentence(s));
    const samples = [];
    samples.push(...completeSentences.slice(0, count));
    if (samples.length < count) {
        const remaining = count - samples.length;
        samples.push(...incompleteSentences.slice(0, remaining));
    }
    return samples.slice(0, count);
}

function extractContentSentences(textFragments) {
    const fullText = textFragments.join('. ').replace(/\s+/g, ' ').trim();
    const doc = nlp(fullText);
    const allSentences = doc.sentences().out('array');
    const processedSentences = allSentences.map(preProcessSentence);
    const uniqueSentences = [...new Set(processedSentences)];
    const contentSentences = uniqueSentences.filter(isContentSentence);
    const removedCount = allSentences.length - contentSentences.length;

    let contentQuality = 'good';
    if (contentSentences.length === 0) {
        contentQuality = 'none';
    } else if (contentSentences.length < 3) {
        contentQuality = 'minimal';
    } else if (contentSentences.length < 10) {
        contentQuality = 'limited';
    }

    return {
        contentSentences,
        removedCount,
        totalFragments: allSentences.length,
        contentQuality,
    };
}

export function calculateFleschKincaid(textFragments) {
  const { contentSentences, removedCount, totalFragments, contentQuality } = extractContentSentences(textFragments);
  const cleanedText = contentSentences.join(' ');
  const words = cleanedText.match(/\b[a-zA-Z]{2,}\b/g) || [];
  const wordCount = words.length;
  const sentenceCount = contentSentences.length > 0 ? contentSentences.length : 1;
  const sentenceList = contentSentences;
  const syllableCount = words.reduce((acc, word) => acc + countSyllables(word), 0);
  const wordSamples = words.slice(0, 20).map(word => ({ word: word, syllables: countSyllables(word) }));
  
  let warnings = [];
  if (contentQuality === 'none') {
    warnings.push('No prose content found - page appears to be navigation/UI only');
  } else if (contentQuality === 'minimal') {
    warnings.push('Very limited prose content - score may not be meaningful');
  } else if (contentQuality === 'limited') {
    warnings.push('Limited prose content - consider adding more explanatory text');
  }
  if (wordCount < 100) {
    warnings.push(`Only ${wordCount} words analyzed - readability scores are most accurate with 100+ words`);
  }
  if (wordCount === 0 || sentenceCount === 0) {
    return { 
      score: 0, words: 0, sentences: 0, syllables: 0,
      debug: { 
        sentenceList: [], wordSamples: [], cleanedTextPreview: '',
        originalTextPreview: textFragments.join(' ').substring(0, 200),
        removedCount: totalFragments, totalFragments: totalFragments,
        contentQuality: contentQuality, warnings: ['No valid content found for analysis']
      }
    };
  }
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  const sampleSentences = getBestSampleSentences(sentenceList, 3);
  
  return {
    score: Math.round(score * 10) / 10,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    debug: {
      sentenceList, 
      wordSamples,
      sampleSentences,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 100) / 100,
      avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      cleanedTextPreview: cleanedText.substring(0, 500),
      originalTextPreview: textFragments.join(' ').substring(0, 300),
      removedCount, totalFragments, contentQuality, warnings
    }
  };
}
