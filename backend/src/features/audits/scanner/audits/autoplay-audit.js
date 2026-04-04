import { Audit } from 'lighthouse';

class AutoplayAudit extends Audit {
  static get meta() {
    return {
      id: 'autoplay-audit',
      title: 'Audio and video content does not autoplay',
      failureTitle: 'Page contains autoplay audio or video without user consent',
      description: 'Autoplay media is disorienting and distressing for older adults, particularly those with cognitive sensitivities or who use screen readers. All audio and video should wait for explicit user interaction before playing. This audit detects <video> and <audio> elements with the autoplay attribute.',
      requiredArtifacts: ['AutoplayMedia'],
    };
  }

  static audit(artifacts) {
    const autoplayElements = artifacts.AutoplayMedia || [];

    if (autoplayElements.length === 0) {
      return {
        score: 1,
        displayValue: 'No autoplay media found',
      };
    }

    const headings = [
      { key: 'tagName', itemType: 'code', text: 'Element' },
      { key: 'src', itemType: 'text', text: 'Source' },
      { key: 'selector', itemType: 'code', text: 'Selector' },
      { key: 'hasMuted', itemType: 'text', text: 'Muted' },
      { key: 'hasControls', itemType: 'text', text: 'Has Controls' },
    ];

    const items = autoplayElements.map((el) => ({
      tagName: el.tagName,
      src: el.src || '(inline)',
      selector: el.selector,
      hasMuted: el.hasMuted ? 'Yes' : 'No',
      hasControls: el.hasControls ? 'Yes' : 'No',
    }));

    const plural = autoplayElements.length === 1 ? '' : 's';
    const displayValue = `${autoplayElements.length} autoplay media element${plural} found`;

    return {
      score: 0,
      displayValue,
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

export default AutoplayAudit;
