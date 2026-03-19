import { Gatherer } from 'lighthouse';

class ColorGatherer extends Gatherer {
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  async getArtifact(passContext) {
    const driver = passContext.driver;

    const collectLinkColorsInBrowser = () => {
      const results = [];
      const links = document.querySelectorAll('a[href]');

      for (const link of (links as unknown as HTMLAnchorElement[])) {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && link.textContent?.trim()) {
          const style = window.getComputedStyle(link);
          const originalColor = link.style.color;
          link.style.color = 'inherit';
          const parentColor = window.getComputedStyle(link).color;
          link.style.color = originalColor;

          results.push({
            text: link.textContent.trim().substring(0, 50),
            linkColor: style.color,
            parentColor: parentColor,
            href: link.href,
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            elementId: link.tagName.toLowerCase() + (link.id ? '#' + link.id : ''),
          });
        }
      }
      return results;
    };

    return driver.executionContext.evaluate(collectLinkColorsInBrowser, {
      args: [],
      useIsolation: true,
    });
  }
}

export default ColorGatherer;
