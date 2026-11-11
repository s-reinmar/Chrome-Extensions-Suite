/**
 * @file PopupController.js
 * @description Główny kontroler MVC wtyczki. Obsługuje import linków, skanowanie DOM i rygorystyczne filtry.
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

    this.widthSlider = null;
    this.heightSlider = null;
    this.saveDebounceTimer = null;
  }

  async init() {
    this.#initSliders();
    this.#bindListeners();
    this.#bindHeaderActions();

    // 1. Wczytanie zapisanych zakresów suwaków ze storage
    await this.#loadStoredConfiguration();
    // 2. Bezpośrednie przeskanowanie karty i zastosowanie filtrów
    await this.#executeScan();
  }

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

  #bindListeners() {
    this.downloadOptionsView.onChange = () => this.#saveCurrentStateDebounced();
    this.downloadOptionsView.onDownloadClick = () => this.#handleDownload();

    this.metadataModalView.onChange = () => this.#saveCurrentStateDebounced();
    this.metadataModalView.onSave = () => this.#saveCurrentStateDebounced();
  }

  #bindHeaderActions() {
    // Import linków z pliku zewnętrznego (.txt, .json, .csv)
    const importBtn = document.getElementById('btn-import-urls');
    const fileInput = document.getElementById('file-url-importer');

    importBtn?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        this.progressView.setProgress('Wczytywanie pliku...', 30);
        const text = await file.text();
        let urls = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          urls = Array.isArray(parsed) ? parsed : Object.values(parsed);
        } else {
          urls = text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.startsWith('http://') || line.startsWith('https://'));
        }

        const items = urls.map((url) => {
          const clean = url.split('?')[0].toLowerCase();
          const ext = clean.split('.').pop() || 'PNG';
          return {
            url,
            width: 512,
            height: 512,
            format: ext.slice(0, 4).toUpperCase()
          };
        });

        this.model.setImages(items);
        this.galleryView.renderImages(this.model.getAllItems());
        this.#applyCurrentFilters();
        this.progressView.setProgress(`Wczytano ${items.length} linków`, 100);
      } catch (err) {
        console.error('[POBIERACZ] Błąd importu:', err);
        this.progressView.setProgress('Błąd parsowania pliku', 100);
      } finally {
        fileInput.value = '';
      }
    });
  }

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

  async #executeScan() {
    try {
      this.progressView.setProgress('Skanowanie karty...', 50);

      const rawImages = await ScannerService.scanActiveTab();
      this.model.setImages(rawImages);

      this.galleryView.renderImages(this.model.getAllItems());
      this.#applyCurrentFilters();

      const stats = this.model.getStats();
      this.progressView.setProgress(`Znaleziono ${stats.total} grafik (${stats.visible} w filtrze)`, 100);
    } catch (err) {
      console.error('[POBIERACZ] Błąd skanowania:', err);
      const msg = err instanceof Error ? err.message : 'Błąd skanowania';
      this.progressView.setProgress(msg, 100);
    }
  }

  #handleFilterChange() {
    this.#saveCurrentStateDebounced();
    this.#applyCurrentFilters();
  }

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

  #syncGalleryUI() {
    const items = this.model.getAllItems();
    const stats = this.model.getStats();

    this.galleryView.updateCardStates(items);
    this.galleryView.updateStats(stats);
    this.downloadOptionsView.updateDownloadButton(stats.selected);
  }

  onCardClick(id) {
    this.model.toggleSelection(id);
    this.#syncGalleryUI();
  }

  onSelectAllToggle(checked) {
    this.model.selectAllVisible(checked);
    this.#syncGalleryUI();
  }

  async #handleDownload() {
    const selected = this.model.getSelectedImages();
    if (selected.length === 0) return;

    this.downloadOptionsView.setButtonState(true);
    this.progressView.setLoading(true);
    this.progressView.setProgress(`Pobieranie ${selected.length} plików...`, 100);

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
      console.error('[POBIERACZ] Błąd pobierania:', err);
      this.downloadOptionsView.setButtonState(false, 'Błąd pobierania');
      this.progressView.setLoading(false);
      this.progressView.setProgress('Błąd pobierania w tle', 100);
    }
  }

  #saveCurrentStateDebounced() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.#saveCurrentState();
    }, 300);
  }

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