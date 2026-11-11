/**
 * @file ImageModel.js
 * @description Headless model danych zarządzający stanem grafik, selekcją i filtrowaniem.
 */

/**
 * @typedef {Object} RawImageItem
 * @property {string} url
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} GalleryItem
 * @property {string} id
 * @property {string} url
 * @property {number} width
 * @property {number} height
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

  /**
   * Zapisuje pobrane obrazy z deduplikacją po adresie URL.
   * @param {RawImageItem[]} rawImages
   */
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
      selected: true,
      isVisible: true // upewnij się, że początkowo są widoczne
    });
  });
}

/**
   * Filtruje elementy według podanych zakresów pikseli.
   * @param {{ minW: number, maxW: number, minH: number, maxH: number }} filter
   */
  applyFilter({ minW, maxW, minH, maxH }) {
    this.#items.forEach((item) => {
      // Jeśli maxW/maxH to 3000 (czyli MAX), nie ograniczamy górnego pułapu
      const matchWidth = item.width >= minW && (maxW >= 3000 || item.width <= maxW);
      const matchHeight = item.height >= minH && (maxH >= 3000 || item.height <= maxH);

      item.isVisible = matchWidth && matchHeight;
    });
  }

  /**
   * Zmienia stan zaznaczenia pojedynczego elementu o ile jest widoczny.
   * @param {string} id
   * @returns {boolean} Nowy stan zaznaczenia lub false jeśli nie znaleziono.
   */
  toggleSelection(id) {
    const item = this.#items.find((i) => i.id === id);
    if (item && item.isVisible) {
      item.selected = !item.selected;
      return item.selected;
    }
    return false;
  }

  /**
   * Zaznacza lub odznacza wszystkie aktualnie widoczne elementy.
   * @param {boolean} forceSelect
   */
  selectAllVisible(forceSelect) {
    this.#items.forEach((item) => {
      if (item.isVisible) {
        item.selected = forceSelect;
      }
    });
  }

  /**
   * Zwraca tylko widoczne elementy wybrane do pobrania.
   * @returns {GalleryItem[]}
   */
  getSelectedImages() {
    return this.#items.filter((item) => item.isVisible && item.selected);
  }

  /**
   * Zwraca kopię wszystkich elementów w modelu.
   * @returns {GalleryItem[]}
   */
  getAllItems() {
    return [...this.#items];
  }

  /**
   * Oblicza bieżące statystyki widoczności i zaznaczeń.
   * @returns {GalleryStats}
   */
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