import { Gatherer } from 'lighthouse';

/**
 * Collects autoplay media elements from the page DOM.
 * Detects <video> and <audio> elements with the autoplay attribute.
 */
class AutoplayGatherer extends Gatherer {
  meta = { supportedModes: ['snapshot', 'navigation'] };

  async getArtifact(context) {
    return context.driver.executionContext.evaluate(
      () => {
        const results = [];

        const selectors = [
          'video[autoplay]',
          'audio[autoplay]',
          'video[autoplay=""]',
          'audio[autoplay=""]',
        ];

        for (const selector of selectors) {
          const elements = Array.from(document.querySelectorAll(selector));
          for (const el of elements) {
            const src = el.getAttribute('src')
              || el.querySelector('source')?.getAttribute('src')
              || '(embedded)';

            results.push({
              tagName: el.tagName.toLowerCase(),
              src: (src || '').substring(0, 100),
              hasMuted: el.hasAttribute('muted'),
              hasControls: el.hasAttribute('controls'),
              selector: el.id
                ? `#${el.id}`
                : el.className
                  ? `${el.tagName.toLowerCase()}.${el.className.trim().split(/\s+/)[0]}`
                  : el.tagName.toLowerCase(),
            });
          }
        }

        return results;
      },
      { args: [] },
    );
  }
}

export default AutoplayGatherer;
