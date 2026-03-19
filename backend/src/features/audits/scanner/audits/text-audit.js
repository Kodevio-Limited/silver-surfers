import { Audit } from 'lighthouse';

const MINIMUM_FONT_SIZE = 16;

class TextAudit extends Audit {
  static get meta() {
    return {
      id: 'text-font-audit',
      title: 'Text is appropriately sized for readability',
      failureTitle: 'Text is too small to be easily readable',
      description: `Clear, readable text is a cornerstone of a good user experience. This audit checks that all text on the page meets a minimum font size of ${MINIMUM_FONT_SIZE}px.`,
      requiredArtifacts: ['PageText'],
    };
  }

  static audit(artifacts) {
    const collectedText = artifacts.PageText;
    
    if (collectedText.length === 0) {
      return { score: 1, notApplicable: true };
    }

    const failingItems = [];
    let passedCount = 0;

    for (const textItem of collectedText) {
      if (parseFloat(textItem.fontSize) < MINIMUM_FONT_SIZE) {
        failingItems.push({
          textSnippet: textItem.text,
          fontSize: textItem.fontSize,
          containerTag: textItem.containerTag,
          containerSelector: textItem.containerSelector,
          node: Audit.makeNodeItem(textItem.containerSelector),
        });
      } else {
        passedCount++;
      }
    }

    const totalCount = collectedText.length;
    const score = passedCount / totalCount;

    let displayValue = '';
    if (failingItems.length > 0) {
      const plural = failingItems.length === 1 ? '' : 's';
      displayValue = `${failingItems.length} text snippet${plural} found with a font size smaller than ${MINIMUM_FONT_SIZE}px`;
    }

    const headings = [
        { key: 'textSnippet', itemType: 'text', text: 'Text Snippet' },
        { key: 'fontSize', itemType: 'text', text: 'Font Size' },
        { key: 'containerTag', itemType: 'code', text: 'Container' },
        { key: 'containerSelector', itemType: 'text', text: 'Selector' },
    ];

    return {
      score: score,
      scoreDisplayMode: 'numeric',
      displayValue: displayValue,
      details: Audit.makeTableDetails(headings, failingItems),
    };
  }
}
export default TextAudit;
