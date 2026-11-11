/**
 * @file DownloadOptionsView.js
 * @description Komponent widoku dla opcji zapisu (podfolder, format) oraz przycisku Download.
 */

/**
 * @typedef {Object} DownloadOptionsValues
 * @property {string} subfolder
 * @property {string} format
 */

export class DownloadOptionsView {
  /**
   * @param {Object} options
   * @param {() => void} [options.onChange] Callback wywoływany przy modyfikacji pól formularza.
   * @param {() => void} [options.onDownloadClick] Callback wywoływany przy kliknięciu przycisku Download.
   */
  constructor({ onChange, onDownloadClick } = {}) {
    /** @type {HTMLInputElement} */
    this.subfolderInput = /** @type {HTMLInputElement} */ (document.getElementById('subfolder'));
    /** @type {HTMLSelectElement} */
    this.formatSelect = /** @type {HTMLSelectElement} */ (document.getElementById('format'));
    /** @type {HTMLButtonElement} */
    this.downloadBtn = /** @type {HTMLButtonElement} */ (document.getElementById('download-btn'));

    this.onChange = onChange;
    this.onDownloadClick = onDownloadClick;

    this.#bindEvents();
  }

  /**
   * Rejestruje nasłuchiwanie zdarzeń na kontrolkach opcji i przycisku.
   * @private
   */
  #bindEvents() {
    const notifyChange = () => {
      if (typeof this.onChange === 'function') {
        this.onChange();
      }
    };

    this.subfolderInput?.addEventListener('input', notifyChange);
    this.formatSelect?.addEventListener('change', notifyChange);

    this.downloadBtn?.addEventListener('click', () => {
      if (typeof this.onDownloadClick === 'function') {
        this.onDownloadClick();
      }
    });
  }

  /**
   * Ustawia wartości początkowe pól opcji.
   * @param {string} [subfolder='']
   * @param {string} [format='original']
   */
  setValues(subfolder = '', format = 'original') {
    if (this.subfolderInput) {
      this.subfolderInput.value = subfolder;
    }
    if (this.formatSelect) {
      this.formatSelect.value = format;
    }
  }

  /**
   * Zwraca aktualne wartości opcji zapisu.
   * @returns {DownloadOptionsValues}
   */
  getValues() {
    return {
      subfolder: this.subfolderInput ? this.subfolderInput.value.trim() : '',
      format: this.formatSelect ? this.formatSelect.value : 'original'
    };
  }

  /**
   * Aktualizuje stan przycisku pobierania w zależności od liczby zaznaczonych elementów.
   * @param {number} selectedCount
   */
  updateDownloadButton(selectedCount) {
    if (!this.downloadBtn) return;

    this.downloadBtn.disabled = selectedCount === 0;
    this.downloadBtn.textContent = selectedCount > 0 ? `Download (${selectedCount})` : 'Download';
  }

  /**
   * Blokuje lub odblokowuje przycisk pobierania podczas trwania procesu.
   * @param {boolean} disabled
   * @param {string} [customText]
   */
  setButtonState(disabled, customText) {
    if (!this.downloadBtn) return;

    this.downloadBtn.disabled = disabled;
    if (customText !== undefined) {
      this.downloadBtn.textContent = customText;
    }
  }
}