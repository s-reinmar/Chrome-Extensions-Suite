/**
 * @file ImageModel.js
 * @description Headless model danych. Realizuje rygorystyczne filtrowanie po pikselach,
 * odcinając miniatury 128x128 oraz śmieci, gdy ustawiony jest wyższy zakres (np. 512x512).
 */

/**
 * @typedef {Object} RawImageItem
 * @property {string} url
 * @property {number} width
 * @property {number} height
 * @property {string} format
 */

/**
 * @typedef {Object} GalleryItem
 * @property {string} id
 * @property {string} url
 * @property {number} width
 * @property {number} height
 * @property {string} format
 * @property {boolean} selected
 * @property {boolean} isVisible
 */

/**
 * @typedef {Object} DimensionFilter
 * @property {number} minW
 * @property {number} maxW
 * @property {number} minH
 * @property {number} maxH
 */

/**
 * @typedef {Object} GalleryStats
 * @property {number} total
 * @property {number} visible
 * @property {number} hidden
 * @property {number} selected
 */

export class ImageModel {
  /** @type {GalleryItem[]} */
  #items = [];

  setImages(rawImages) {
    const uniqueUrls = new Set();
    this.#items = [];

    rawImages.forEach((img, idx) => {
      if (!img.url || uniqueUrls.has(img.url)) return;
      uniqueUrls.add(img.url);

      this.#items.push({
        id: `img_${idx}_${Date.now()}`,
        url: img.url,
        width: Number(img.width) || 0,
        height: Number(img.height) || 0,
        format: (img.format || 'IMG').toUpperCase(),
        selected: true,
        isVisible: true
      });
    });
  }

  /**
   * Ścisłe filtrowanie po pikselach.
   * Jeśli suwak minW to np. 480, to obraz 128px trafia do filtered out.
   * Obraz 512px mieści się w przedziale 480 - 840 i jest widoczny.
   * @param {DimensionFilter} filter
   */
  applyFilter({ minW, maxW, minH, maxH }) {
    const effectiveMinW = Number(minW) || 0;
    const effectiveMaxW = Number(maxW) || 3000;
    const effectiveMinH = Number(minH) || 0;
    const effectiveMaxH = Number(maxH) || 3000;

    this.#items.forEach((item) => {
      const matchWidth = item.width >= effectiveMinW && (effectiveMaxW >= 3000 || item.width <= effectiveMaxW);
      const matchHeight = item.height >= effectiveMinH && (effectiveMaxH >= 3000 || item.height <= effectiveMaxH);

      item.isVisible = matchWidth && matchHeight;
    });
  }

  toggleSelection(id) {
    const item = this.#items.find((i) => i.id === id);
    if (item && item.isVisible) {
      item.selected = !item.selected;
      return item.selected;
    }
    return false;
  }

  selectAllVisible(forceSelect) {
    this.#items.forEach((item) => {
      if (item.isVisible) {
        item.selected = forceSelect;
      }
    });
  }

  getSelectedImages() {
    return this.#items.filter((item) => item.isVisible && item.selected);
  }

  getAllItems() {
    return [...this.#items];
  }

  getStats() {
    const visibleCount = this.#items.filter((i) => i.isVisible).length;
    const selectedCount = this.#items.filter((i) => i.isVisible && i.selected).length;

    return {
      total: this.#items.length,
      visible: visibleCount,
      hidden: this.#items.length - visibleCount,
      selected: selectedCount
    };
  }
}