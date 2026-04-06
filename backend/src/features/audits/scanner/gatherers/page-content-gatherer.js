import { Gatherer } from 'lighthouse';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PageContentGatherer extends Gatherer {
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation']
  };

  async getArtifact(context) {
    const compromisePath = join(__dirname, '../../../../../node_modules/compromise/builds/compromise.min.js');
    const compromiseCode = fs.readFileSync(compromisePath, 'utf8');

    const pageContent = await context.driver.executionContext.evaluate(
      (compromiseLib) => {
        eval(compromiseLib);
        
        const fullText = document.body.innerText || '';
        
        try {
          const doc = window.nlp(fullText);
          const allSentences = doc.sentences().json();
          const sentencesWithVerbs = doc.sentences().filter((s) => s.verbs().length > 0).json();
          
          return {
            fullText: fullText,
            nlpAnalysis: {
              allSentences: allSentences,
              sentencesWithVerbs: sentencesWithVerbs,
              totalSentences: allSentences.length,
              sentencesWithVerbsCount: sentencesWithVerbs.length,
              wordCount: doc.words().length
            },
            error: null,
            url: window.location.href
          };
        } catch (e) {
          return {
            fullText: fullText,
            nlpAnalysis: null,
            error: e instanceof Error ? e.message : String(e),
            url: window.location.href
          };
        }
      },
      { args: [compromiseCode] }
    );

    return pageContent;
  }
}

export default PageContentGatherer;
