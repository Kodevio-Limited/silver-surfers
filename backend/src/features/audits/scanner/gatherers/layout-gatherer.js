import { Gatherer } from 'lighthouse';

function collectBrittleLayoutElements() {
  function getCssSelector(el) {
    if (!(el instanceof Element)) return '';
    const path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += '#' + el.id;
        path.unshift(selector);
        break;
      } else {
        let sib = el, nth = 1;
        while ((sib = (sib as any).previousElementSibling)) {
          if (sib.nodeName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += `:nth-of-type(${nth})`;
      }
      path.unshift(selector);
      el = (el as any).parentNode;
    }
    return path.join(' > ');
  }

  const candidates = [];
  const allElements = document.querySelectorAll('body *:not(script):not(style):not(meta):not(link)');
  for (const element of (allElements as unknown as HTMLElement[])) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const hasVisibleText = rect.width > 0 && rect.height > 0 && (element.textContent?.trim().length || 0) > 10;
    if (!hasVisibleText) continue;

    const hasFixedPixelHeight = style.height.endsWith('px');
    const hasFixedPixelMaxHeight = style.maxHeight.endsWith('px') && style.maxHeight !== 'none';

    if (hasFixedPixelHeight || hasFixedPixelMaxHeight) {
      candidates.push(element);
    }
  }

  const finalElements = candidates.filter(elementA => {
    return !candidates.some(elementB => elementA !== elementB && elementA.contains(elementB));
  });

  const results = [];
  for (const element of finalElements) {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const hasFixedPixelHeight = style.height.endsWith('px');

      results.push({
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        selector: getCssSelector(element),
        textSnippet: element.textContent?.trim().substring(0, 100),
        failingProperty: hasFixedPixelHeight ? 'height' : 'max-height',
        propertyValue: hasFixedPixelHeight ? style.height : style.maxHeight,
        overflow: style.overflowY,
      });
  }

  return results;
}

class LayoutGatherer extends Gatherer {
  meta = { supportedModes: ['snapshot', 'timespan', 'navigation'] };
  async getArtifact(passContext) {
    const driver = passContext.driver;
    return driver.executionContext.evaluate(collectBrittleLayoutElements, {
      args: [],
      useIsolation: true,
    });
  }
}

export default LayoutGatherer;
