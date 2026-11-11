/**
 * @file ScannerService.js
 */
export class ScannerService {
  static async scanActiveTab() {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab?.id) {
      throw new Error('Nie znaleziono aktywnej karty.');
    }

    if (!activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://')) {
      throw new Error('Nieobsługiwany URL strony.');
    }

    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id, allFrames: true },
      func: async () => {
        const nodes = Array.from(document.querySelectorAll('img, picture source'));
        const seenUrls = new Set();
        const baseUri = document.baseURI;
        const candidates = [];

        for (const node of nodes) {
          let rawUrl = node.getAttribute('src');

          if (!rawUrl && node.hasAttribute('srcset')) {
            const srcset = node.getAttribute('srcset') || '';
            rawUrl = srcset.split(',')[0].trim().split(' ')[0];
          }

          if (!rawUrl || rawUrl.startsWith('data:')) continue;

          try {
            const absoluteUrl = new URL(rawUrl, baseUri).href;
            if (seenUrls.has(absoluteUrl)) continue;
            seenUrls.add(absoluteUrl);

            let w = node instanceof HTMLImageElement ? node.naturalWidth : 0;
            let h = node instanceof HTMLImageElement ? node.naturalHeight : 0;

            candidates.push({ url: absoluteUrl, width: w, height: h });
          } catch {
            // Ignoruj błędy parsowania
          }
        }

        // Dociągnij brakujące realne wymiary dla obrazów z 0x0
        const resolved = await Promise.all(
          candidates.map((img) => {
            if (img.width > 0 && img.height > 0) return Promise.resolve(img);

            return new Promise((resolve) => {
              const probe = new Image();
              probe.onload = () => {
                img.width = probe.naturalWidth || 0;
                img.height = probe.naturalHeight || 0;
                resolve(img);
              };
              probe.onerror = () => resolve(img);
              probe.src = img.url;
            });
          })
        );

        return resolved;
      }
    });

    const collectedImages = [];
    if (injectionResults && Array.isArray(injectionResults)) {
      for (const frame of injectionResults) {
        if (Array.isArray(frame.result)) {
          collectedImages.push(...frame.result);
        }
      }
    }

    return collectedImages;
  }
}