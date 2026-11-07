/**
 * @typedef {Object} ImageMetadata
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

(() => {
    const images = Array.from(document.querySelectorAll('img, picture source'));
    /** @type {ImageMetadata[]} */
    const extracted = [];
    const seenUrls = new Set();

    images.forEach(img => {
        let url = img.src || (img.srcset ? img.srcset.split(',')[0].trim().split(' ')[0] : null);
        if (!url || url.startsWith('data:')) return;

        try {
            const absoluteUrl = new URL(url, document.baseURI).href;
            if (!seenUrls.has(absoluteUrl)) {
                seenUrls.add(absoluteUrl);
                extracted.push({
                    url: absoluteUrl,
                    width: img.naturalWidth || img.clientWidth || 0,
                    height: img.naturalHeight || img.clientHeight || 0
                });
            }
        } catch (e) {
            // Ignorujemy błędy parsowania adresów lokalnych
        }
    });
    
    return extracted;
})();