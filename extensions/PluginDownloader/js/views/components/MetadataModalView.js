/**
 * @file MetadataModalView.js
 * @description Komponent widoku obsługujący okienko modalne metadanych oraz powiązane pola formularza.
 */

/**
 * @typedef {import('../../services/StorageService.js').ExtensionMetadata} ExtensionMetadata
 */

export class MetadataModalView {
  /**
   * @param {Object} options
   * @param {() => void} [options.onChange] Callback wywoływany przy zmianie wartości pól.
   * @param {() => void} [options.onSave] Callback wywoływany przy kliknięciu przycisku zapisu.
   */
  constructor({ onChange, onSave } = {}) {
    this.onChange = onChange;
    this.onSave = onSave;

    // Elementy struktury modala
    this.openBtn = document.getElementById('open-meta-btn');
    this.modal = document.getElementById('meta-modal');
    this.cancelBtn = document.getElementById('meta-cancel-btn');
    this.saveBtn = document.getElementById('meta-save-btn');

    // Pola formularza metadanych
    this.inputs = {
      title: /** @type {HTMLInputElement} */ (document.getElementById('meta-title')),
      rating: /** @type {HTMLSelectElement} */ (document.getElementById('meta-rating')),
      tags: /** @type {HTMLInputElement} */ (document.getElementById('meta-tags')),
      comments: /** @type {HTMLTextAreaElement} */ (document.getElementById('meta-comments')),
      authors: /** @type {HTMLInputElement} */ (document.getElementById('meta-authors')),
      dateTaken: /** @type {HTMLInputElement} */ (document.getElementById('meta-date-taken')),
      software: /** @type {HTMLInputElement} */ (document.getElementById('meta-software')),
      dateAcquired: /** @type {HTMLInputElement} */ (document.getElementById('meta-date-acquired')),
      copyright: /** @type {HTMLInputElement} */ (document.getElementById('meta-copyright'))
    };

    this.#bindEvents();
  }

  /**
   * Podpina listenery dla przycisków otwarcia/zamknięcia modala oraz pól edycji.
   * @private
   */
  #bindEvents() {
    this.openBtn?.addEventListener('click', () => this.open());
    this.cancelBtn?.addEventListener('click', () => this.close());

    this.saveBtn?.addEventListener('click', () => {
      if (typeof this.onSave === 'function') {
        this.onSave();
      }
      this.close();
    });

    const notifyChange = () => {
      if (typeof this.onChange === 'function') {
        this.onChange();
      }
    };

    Object.values(this.inputs).forEach((input) => {
      if (input) {
        input.addEventListener('input', notifyChange);
        input.addEventListener('change', notifyChange);
      }
    });
  }

  /**
   * Otwiera okno modalne.
   */
  open() {
    this.modal?.classList.add('active');
  }

  /**
   * Zamyka okno modalne.
   */
  close() {
    this.modal?.classList.remove('active');
  }

  /**
   * Wypełnia pola formularza wartościami z konfiguracji.
   * @param {ExtensionMetadata} [metadata]
   */
  setValues(metadata = {}) {
    if (this.inputs.title) this.inputs.title.value = metadata.title || '';
    if (this.inputs.rating) this.inputs.rating.value = metadata.rating || '0';
    if (this.inputs.tags) this.inputs.tags.value = metadata.tags || '';
    if (this.inputs.comments) this.inputs.comments.value = metadata.comments || '';
    if (this.inputs.authors) this.inputs.authors.value = metadata.authors || '';
    if (this.inputs.dateTaken) this.inputs.dateTaken.value = metadata.dateTaken || '';
    if (this.inputs.software) this.inputs.software.value = metadata.software || '';
    if (this.inputs.dateAcquired) this.inputs.dateAcquired.value = metadata.dateAcquired || '';
    if (this.inputs.copyright) this.inputs.copyright.value = metadata.copyright || '';
  }

  /**
   * Pobiera aktualny stan pól metadanych w formacie zgodnym ze schematem konfiguracji.
   * @returns {ExtensionMetadata}
   */
  getValues() {
    return {
      title: this.inputs.title ? this.inputs.title.value.trim() : '',
      rating: this.inputs.rating ? this.inputs.rating.value : '0',
      tags: this.inputs.tags ? this.inputs.tags.value.trim() : '',
      comments: this.inputs.comments ? this.inputs.comments.value.trim() : '',
      authors: this.inputs.authors ? this.inputs.authors.value.trim() : '',
      dateTaken: this.inputs.dateTaken ? this.inputs.dateTaken.value : '',
      software: this.inputs.software ? this.inputs.software.value.trim() : '',
      dateAcquired: this.inputs.dateAcquired ? this.inputs.dateAcquired.value : '',
      copyright: this.inputs.copyright ? this.inputs.copyright.value.trim() : ''
    };
  }
}