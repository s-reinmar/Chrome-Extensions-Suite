/**
 * @file content.js
 * @description Skrypt wstrzykiwany do aktywnej karty odpowiedzialny za ekstrakcję grafik z DOM.
 */

/**
 * @typedef {Object} ExtractedImage
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

class DomImageExtractor {
  /**
   * Wyciąga czysty URL z tagu <img> lub <source> (obsługa src oraz srcset).
   * @param {Element} element
   * @param {string} baseUri
   * @returns {string|null}
   */
  static extractUrl(element, baseUri) {
    let rawUrl = element.getAttribute('src');

    if (!rawUrl && element.hasAttribute('srcset')) {
      const srcset = element.getAttribute('srcset') || '';
      rawUrl = srcset.split(',')[0].trim().split(' ')[0];
    }

    if (!rawUrl || rawUrl.startsWith('data:')) {
      return null;
    }

    try {
      return new URL(rawUrl, baseUri).href;
    } catch {
      return null;
    }
  }

  /**
   * Odczytuje rzeczywiste wymiary elementu graficznego.
   * @param {Element} element
   * @returns {{ width: number, height: number }}
   */
  static extractDimensions(element) {
    if (element instanceof HTMLImageElement) {
      return {
        width: element.naturalWidth || element.clientWidth || 0,
        height: element.naturalHeight || element.clientHeight || 0
      };
    }

    return {
      width: element.clientWidth || 0,
      height: element.clientHeight || 0
    };
  }

  /**
   * Skanuje bieżący dokument i zwraca unikalne grafiki.
   * @returns {ExtractedImage[]}
   */
  static scan() {
    const nodes = document.querySelectorAll('img, picture source');
    const results = [];
    const seenUrls = new Set();
    const baseUri = document.baseURI;

    for (const node of nodes) {
      const url = DomImageExtractor.extractUrl(node, baseUri);
      if (!url || seenUrls.has(url)) continue;

      seenUrls.add(url);
      const dims = DomImageExtractor.extractDimensions(node);

      results.push({
        url,
        width: dims.width,
        height: dims.height
      });
    }

    return results;
  }
}

// Ostatnie wyrażenie jest automatycznie zwracane jako wynik do chrome.scripting.executeScript
DomImageExtractor.scan();