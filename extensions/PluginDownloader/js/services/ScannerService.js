/**
 * @file ScannerService.js
 * @description Skaner aktywnej karty Chrome z filtrowaniem śmieci i ikon UI platformy Flaticon.
 */

export class ScannerService {
  /**
   * @returns {Promise<Array<{ url: string, width: number, height: number, format: string }>>}
   */
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
        const seenUrls = new Set();
        const baseUri = document.baseURI;
        const candidates = [];
        const isFlaticon = window.location.hostname.includes('flaticon.com');

        const detectFormat = (url) => {
          if (!url) return 'IMG';
          const clean = url.split('?')[0].split('#')[0].toLowerCase();
          if (clean.endsWith('.png')) return 'PNG';
          if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'JPEG';
          if (clean.endsWith('.webp')) return 'WEBP';
          if (clean.endsWith('.svg')) return 'SVG';
          return 'IMG';
        };

        const addCandidate = (rawUrl, node) => {
          if (!rawUrl || typeof rawUrl !== 'string') return;
          if (rawUrl.startsWith('data:') && rawUrl.length < 200) return;

          let targetUrl = rawUrl;
          if (!rawUrl.startsWith('data:')) {
            try {
              targetUrl = new URL(rawUrl, baseUri).href;
            } catch {
              return;
            }
          }

          let initialWidth = 0;
          let initialHeight = 0;

          // FLATICON FIX:
          if (isFlaticon && targetUrl.includes('flaticon.com')) {
            // Ignoruj assety interfejsu, awatary i bannery Flaticona
            if (
              targetUrl.includes('/uicons/') ||
              targetUrl.includes('/avatar/') ||
              targetUrl.includes('/img/') ||
              targetUrl.includes('/stickers/') && !window.location.pathname.includes('/stickers/')
            ) {
              return;
            }

            if (targetUrl.includes('/128/') || targetUrl.includes('/64/')) {
              targetUrl = targetUrl.replace(/\/128\//, '/512/').replace(/\/64\//, '/512/');
              initialWidth = 512;
              initialHeight = 512;
            }
          } else if (node instanceof HTMLImageElement) {
            initialWidth = node.naturalWidth || 0;
            initialHeight = node.naturalHeight || 0;
          }

          if (seenUrls.has(targetUrl)) return;
          seenUrls.add(targetUrl);

          candidates.push({
            url: targetUrl,
            width: initialWidth,
            height: initialHeight,
            format: detectFormat(targetUrl)
          });
        };

        // Na Flaticon szukamy wyłącznie w siatkach miniaturek (.icon--holder, [data-icon_id], ul.icons itp.)
        let imgElements;
        if (isFlaticon) {
          imgElements = document.querySelectorAll(
            'ul.icons img, .icon--holder img, [data-icon_id] img, .item-icon img, .grid-container img'
          );
          // Jeśli specyficzne kontenery nie zostały znalezione, bierzemy ogólne <img>
          if (!imgElements || imgElements.length === 0) {
            imgElements = document.querySelectorAll('img');
          }
        } else {
          imgElements = document.querySelectorAll('img');
        }

        imgElements.forEach((img) => {
          // Ignoruj obrazy ukryte w stylach lub będące elementami nawigacji UI
          if (img.closest('header, footer, nav, aside, .header, .footer, .sidebar')) {
            return;
          }

          let src = img.getAttribute('data-src') || 
                    img.getAttribute('src') || 
                    img.currentSrc;

          if (src && !src.startsWith('data:image/svg')) {
            addCandidate(src, img);
          }
        });

        // Weryfikacja wymiarów
        const resolved = await Promise.all(
          candidates.map((img) => {
            if (img.width > 0 && img.height > 0) {
              return Promise.resolve(img);
            }

            return new Promise((resolve) => {
              const probe = new Image();
              let isSettled = false;

              const finalize = (valid) => {
                if (isSettled) return;
                isSettled = true;
                if (!valid) {
                  img.width = 0;
                  img.height = 0;
                }
                resolve(img);
              };

              probe.onload = () => {
                img.width = probe.naturalWidth || 0;
                img.height = probe.naturalHeight || 0;
                finalize(img.width > 0 && img.height > 0);
              };

              probe.onerror = () => finalize(false);
              setTimeout(() => finalize(false), 1200);
              probe.src = img.url;
            });
          })
        );

        return resolved.filter((item) => item.width > 0 && item.height > 0);
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