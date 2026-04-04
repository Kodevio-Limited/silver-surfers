import { Audit } from 'lighthouse';

const MINIMUM_LINE_HEIGHT_RATIO = 1.5;
const BODY_TEXT_TAGS = new Set(['p', 'li', 'td', 'th', 'dd', 'dt', 'blockquote', 'figcaption', 'label', 'span', 'div']);

class LineSpacingAudit extends Audit {
  static get meta() {
    return {
      id: 'line-spacing-audit',
      title: 'Body text has adequate line spacing for readability',
      failureTitle: 'Body text line spacing is too tight for older adults',
      description: `Line spacing of at least 1.5× the font size improves readability significantly for older adults, reducing eye strain when tracking across lines. This audit checks that body text elements meet the 1.5× line-height minimum recommended by accessibility guidelines for senior users.`,
      requiredArtifacts: ['PageText'],
    };
  }

  static audit(artifacts) {
    const collectedText = artifacts.PageText;

    const bodyTextItems = collectedText.filter((item) => BODY_TEXT_TAGS.has(item.containerTag));

    if (bodyTextItems.length === 0) {
      return { score: 1, notApplicable: true };
    }

    const failingItems = [];
    let passedCount = 0;

    for (const item of bodyTextItems) {
      const fontSizePx = parseFloat(item.fontSize);
      const lineHeightValue = item.lineHeight;

      if (!fontSizePx || fontSizePx <= 0) {
        passedCount++;
        continue;
      }

      let lineHeightPx = null;

      if (lineHeightValue && lineHeightValue !== 'normal') {
        if (lineHeightValue.endsWith('px')) {
          lineHeightPx = parseFloat(lineHeightValue);
        } else {
          const ratio = parseFloat(lineHeightValue);
          if (Number.isFinite(ratio)) {
            lineHeightPx = ratio * fontSizePx;
          }
        }
      }

      // 'normal' is typically ~1.2 — treat as failing for senior-friendly audit
      if (lineHeightPx === null) {
        failingItems.push({
          textSnippet: item.text,
          fontSize: item.fontSize,
          lineHeight: lineHeightValue || 'normal',
          containerTag: item.containerTag,
          containerSelector: item.containerSelector,
          node: Audit.makeNodeItem(item.containerSelector),
        });
        continue;
      }

      const ratio = lineHeightPx / fontSizePx;

      if (ratio < MINIMUM_LINE_HEIGHT_RATIO) {
        failingItems.push({
          textSnippet: item.text,
          fontSize: item.fontSize,
          lineHeight: lineHeightValue,
          containerTag: item.containerTag,
          containerSelector: item.containerSelector,
          node: Audit.makeNodeItem(item.containerSelector),
        });
      } else {
        passedCount++;
      }
    }

    const totalCount = bodyTextItems.length;
    const score = totalCount > 0 ? passedCount / totalCount : 1;

    let displayValue = '';
    if (failingItems.length > 0) {
      const plural = failingItems.length === 1 ? '' : 's';
      displayValue = `${failingItems.length} text element${plural} with line spacing below ${MINIMUM_LINE_HEIGHT_RATIO}×`;
    }

    const headings = [
      { key: 'textSnippet', itemType: 'text', text: 'Text Sample' },
      { key: 'fontSize', itemType: 'text', text: 'Font Size' },
      { key: 'lineHeight', itemType: 'text', text: 'Line Height' },
      { key: 'containerTag', itemType: 'code', text: 'Element' },
      { key: 'containerSelector', itemType: 'text', text: 'Selector' },
    ];

    return {
      score,
      scoreDisplayMode: 'numeric',
      displayValue,
      details: Audit.makeTableDetails(headings, failingItems),
    };
  }
}

export default LineSpacingAudit;
