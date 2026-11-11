/**
 * @file PopupController.js
 * @description Główny kontroler MVC orkiestrujący modele, widoki i serwisy wtyczki.
 */

import { StorageService } from '../services/StorageService.js';
import { ScannerService } from '../services/ScannerService.js';
import { DownloadService } from '../services/DownloadService.js';
import { DualSlider } from '../views/components/DualSlider.js';

export class PopupController {
  /**
   * @param {Object} dependencies
   * @param {import('../models/ImageModel.js').ImageModel} dependencies.model
   * @param {import('../views/GalleryView.js').GalleryView} dependencies.galleryView
   * @param {import('../views/components/ProgressView.js').ProgressView} dependencies.progressView
   * @param {import('../views/components/DownloadOptionsView.js').DownloadOptionsView} dependencies.downloadOptionsView
   * @param {import('../views/components/MetadataModalView.js').MetadataModalView} dependencies.metadataModalView
   */
  constructor({
    model,
    galleryView,
    progressView,
    downloadOptionsView,
    metadataModalView
  }) {
    this.model = model;
    this.galleryView = galleryView;
    this.progressView = progressView;
    this.downloadOptionsView = downloadOptionsView;
    this.metadataModalView = metadataModalView;

    /** @type {DualSlider|null} */
    this.widthSlider = null;
    /** @type {DualSlider|null} */
    this.heightSlider = null;
  }

  /**
   * Inicjalizacja całej aplikacji Popup.
   * @returns {Promise<void>}
   */
  async init() {
    this.#initSliders();
    this.#bindListeners();

    await this.#loadStoredConfiguration();
    await this.#executeScan();
  }

  /**
   * Inicjalizuje komponenty suwaków dla szerokości i wysokości.
   * @private
   */
  #initSliders() {
    const widthEl = document.getElementById('width-filter');
    const heightEl = document.getElementById('height-filter');

    if (widthEl) {
      this.widthSlider = new DualSlider(widthEl, () => this.#handleFilterChange());
    }
    if (heightEl) {
      this.heightSlider = new DualSlider(heightEl, () => this.#handleFilterChange());
    }
  }

  /**
   * Rejestruje obsługę zdarzeń z poszczególnych widoków.
   * @private
   */
  #bindListeners() {
    // Zdarzenia opcji pobierania
    this.downloadOptionsView.onChange = () => this.#saveCurrentState();
    this.downloadOptionsView.onDownloadClick = () => this.#handleDownload();

    // Zdarzenia formularza metadanych
    this.metadataModalView.onChange = () => this.#saveCurrentState();
    this.metadataModalView.onSave = () => this.#saveCurrentState();
  }

  /**
   * Ładuje zapisaną konfigurację i synchronizuje widoki.
   * @private
   */
  async #loadStoredConfiguration() {
    const config = await StorageService.loadConfig();

    this.downloadOptionsView.setValues(config.subfolder, config.format);
    this.metadataModalView.setValues(config.metadata);

    if (this.widthSlider) {
      this.widthSlider.setValues(config.minW, config.maxW);
    }
    if (this.heightSlider) {
      this.heightSlider.setValues(config.minH, config.maxH);
    }
  }

  /**
   * Wykonuje skanowanie aktywnej karty i zasila model danymi.
   * @private
   */
  async #executeScan() {
    try {
      this.progressView.setProgress('Skanowanie aktywnej karty...', 50);

      const rawImages = await ScannerService.scanActiveTab();
      this.model.setImages(rawImages);

      this.galleryView.renderImages(this.model.getAllItems());
      this.#applyCurrentFilters();

      this.progressView.setProgress('Zakończono pomyślnie', 100);
    } catch (err) {
      console.error('Błąd podczas skanowania:', err);
      const msg = err instanceof Error ? err.message : 'Błąd ekstrakcji grafik';
      this.progressView.setProgress(msg, 100);
    }
  }

  /**
   * Obsługa zmiany zakresu suwaków wymiarów.
   * @private
   */
  #handleFilterChange() {
    this.#saveCurrentState();
    this.#applyCurrentFilters();
  }

  /**
   * Filtruje stan modelu i odświeża widok galerii oraz statystyki.
   * @private
   */
  #applyCurrentFilters() {
    const w = this.widthSlider ? this.widthSlider.getValues() : { min: 0, max: 3000 };
    const h = this.heightSlider ? this.heightSlider.getValues() : { min: 0, max: 3000 };

    this.model.applyFilter({
      minW: w.min,
      maxW: w.max,
      minH: h.min,
      maxH: h.max
    });

    this.#syncGalleryUI();
  }

  /**
   * Synchronizuje wygląd miniaturek i liczników na podstawie stanu modelu.
   * @private
   */
  #syncGalleryUI() {
    const items = this.model.getAllItems();
    const stats = this.model.getStats();

    this.galleryView.updateCardStates(items);
    this.galleryView.updateStats(stats);
    this.downloadOptionsView.updateDownloadButton(stats.selected);
  }

  /**
   * Obsługa kliknięcia kafelka obrazu.
   * @param {string} id
   */
  onCardClick(id) {
    this.model.toggleSelection(id);
    this.#syncGalleryUI();
  }

  /**
   * Obsługa zaznaczenia / odznaczenia wszystkich widocznych grafik.
   * @param {boolean} checked
   */
  onSelectAllToggle(checked) {
    this.model.selectAllVisible(checked);
    this.#syncGalleryUI();
  }

  /**
   * Wykonuje proces pobierania zaznaczonych plików w tle.
   * @private
   */
  async #handleDownload() {
    const selected = this.model.getSelectedImages();
    if (selected.length === 0) return;

    this.downloadOptionsView.setButtonState(true);
    this.progressView.setLoading(true);
    this.progressView.setProgress(`Pobieranie ${selected.length} plików w tle...`, 100);

    const options = this.downloadOptionsView.getValues();
    const metadata = this.metadataModalView.getValues();

    try {
      await DownloadService.startDownload({
        items: selected,
        subfolder: options.subfolder,
        metadata
      });

      setTimeout(() => {
        this.downloadOptionsView.setButtonState(false, `Pobrano (${selected.length})`);
        this.progressView.setLoading(false);
      }, 1500);
    } catch (err) {
      console.error('Błąd pobierania:', err);
      this.downloadOptionsView.setButtonState(false, 'Błąd pobierania');
      this.progressView.setLoading(false);
      this.progressView.setProgress('Błąd pobierania w tle', 100);
    }
  }

  /**
   * Trwale zapisuje stan konfiguracji w chrome.storage.local.
   * @private
   */
  #saveCurrentState() {
    const w = this.widthSlider ? this.widthSlider.getValues() : { min: 0, max: 3000 };
    const h = this.heightSlider ? this.heightSlider.getValues() : { min: 0, max: 3000 };
    const options = this.downloadOptionsView.getValues();
    const metadata = this.metadataModalView.getValues();

    StorageService.saveConfig({
      minW: w.min,
      maxW: w.max,
      minH: h.min,
      maxH: h.max,
      subfolder: options.subfolder,
      format: options.format,
      metadata
    });
  }
}