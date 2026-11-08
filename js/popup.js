/**
 * @file popup.js
 * @description Główny skrypt interfejsu rozszerzenia (Popup) obsługujący filtry, galerię i rozszerzone metadane.
 */

class StorageManager {
    static async loadConfig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['downloaderConfig'], (result) => {
                resolve(result.downloaderConfig || { 
                    minW: 0, maxW: 3000, minH: 0, maxH: 3000, 
                    subfolder: '', format: 'original',
                    metadata: { 
                        title: '', 
                        rating: '0', 
                        tags: '', 
                        comments: '', 
                        authors: '', 
                        dateTaken: '', 
                        software: '', 
                        dateAcquired: '', 
                        copyright: '' 
                    }
                });
            });
        });
    }
    static saveConfig(config) { 
        chrome.storage.local.set({ downloaderConfig: config }); 
    }
}

class DualSlider {
    constructor(root, onChangeCallback) {
        this.minInput = root.querySelector('.min-input');
        this.maxInput = root.querySelector('.max-input');
        this.rangeVisual = root.querySelector('.slider-range');
        this.minDisplay = root.querySelector('.min-val');
        this.maxDisplay = root.querySelector('.max-val');
        this.onChange = onChangeCallback;
        this.bindEvents();
    }

    bindEvents() {
        const update = () => {
            let minVal = parseInt(this.minInput.value, 10);
            let maxVal = parseInt(this.maxInput.value, 10);
            
            if (minVal > maxVal) {
                const tmp = minVal;
                minVal = maxVal;
                maxVal = tmp;
                this.minInput.value = minVal;
                this.maxInput.value = maxVal;
            }

            const maxLimit = parseInt(this.maxInput.max, 10);
            this.minDisplay.textContent = `${minVal}px`;
            this.maxDisplay.textContent = maxVal >= maxLimit ? `MAX` : `${maxVal}px`;

            const minP = (minVal / maxLimit) * 100;
            const maxP = (maxVal / maxLimit) * 100;
            this.rangeVisual.style.left = `${minP}%`;
            this.rangeVisual.style.width = `${maxP - minP}%`;

            this.onChange();
        };

        this.minInput.addEventListener('input', update);
        this.maxInput.addEventListener('input', update);
    }

    setValues(min, max) {
        this.minInput.value = min; 
        this.maxInput.value = max;
        this.minInput.dispatchEvent(new Event('input'));
    }

    getValues() { 
        return { 
            min: parseInt(this.minInput.value, 10), 
            max: parseInt(this.maxInput.value, 10) 
        }; 
    }
}

class GalleryUI {
    constructor(container, onSelectionChange) {
        this.container = container;
        this.onSelectionChange = onSelectionChange;
        this.images = [];
        this.selectAllCb = document.getElementById('select-all-cb');
        this.statMatching = document.getElementById('stat-matching');
        this.statFiltered = document.getElementById('stat-filtered');
        this.statSelected = document.getElementById('stat-selected');

        this.selectAllCb.addEventListener('change', (e) => this.toggleAllVisible(e.target.checked));
    }

    setImages(rawImages) {
        this.container.innerHTML = '';
        this.images = [];
        const uniqueUrls = new Set();

        rawImages.forEach(img => {
            if (uniqueUrls.has(img.url)) return;
            uniqueUrls.add(img.url);

            const card = document.createElement('div');
            card.className = 'image-card selected';
            card.innerHTML = `<img src="${img.url}" loading="lazy"><div class="dimensions">${img.width}x${img.height}</div>`;
            
            const item = { ...img, selected: true, element: card };
            this.images.push(item);
            
            card.addEventListener('click', () => this.toggleSelection(item));
            this.container.appendChild(card);
        });
        
        this.updateStats();
    }

    applyFilter(config) {
        this.images.forEach(item => {
            const isMatch = (
                item.width >= config.minW && (config.maxW >= 3000 || item.width <= config.maxW) &&
                item.height >= config.minH && (config.maxH >= 3000 || item.height <= config.maxH)
            );
            if (isMatch) {
                item.element.classList.remove('hidden');
            } else {
                item.element.classList.add('hidden');
            }
        });
        this.updateStats();
    }

    toggleSelection(item) {
        if (item.element.classList.contains('hidden')) return;
        item.selected = !item.selected;
        item.element.classList.toggle('selected', item.selected);
        this.updateStats();
    }

    toggleAllVisible(forceSelect) {
        this.images.forEach(item => {
            if (!item.element.classList.contains('hidden')) {
                item.selected = forceSelect;
                item.element.classList.toggle('selected', forceSelect);
            }
        });
        this.updateStats();
    }

    updateStats() {
        const visible = this.images.filter(i => !i.element.classList.contains('hidden'));
        const hiddenCount = this.images.length - visible.length;
        const selectedCount = visible.filter(i => i.selected).length;

        this.statMatching.textContent = `${visible.length} matching`;
        this.statFiltered.textContent = `${hiddenCount} filtered out`;
        this.statSelected.textContent = `${selectedCount} selected`;
        
        this.selectAllCb.checked = visible.length > 0 && selectedCount === visible.length;
        this.onSelectionChange(selectedCount);
    }

    getSelectedImages() {
        return this.images.filter(i => i.selected && !i.element.classList.contains('hidden'));
    }
}

class DownloaderUI {
    constructor() {
        this.subfolderInput = document.getElementById('subfolder');
        this.formatSelect = document.getElementById('format');
        this.downloadBtn = document.getElementById('download-btn');
        
        // Elementy okienka modalnego
        this.openMetaBtn = document.getElementById('open-meta-btn');
        this.metaModal = document.getElementById('meta-modal');
        this.metaCancelBtn = document.getElementById('meta-cancel-btn');
        this.metaSaveBtn = document.getElementById('meta-save-btn');

        // Pola metadanych
        this.metaTitle = document.getElementById('meta-title');
        this.metaRating = document.getElementById('meta-rating');
        this.metaTags = document.getElementById('meta-tags');
        this.metaComments = document.getElementById('meta-comments');
        this.metaAuthors = document.getElementById('meta-authors');
        this.metaDateTaken = document.getElementById('meta-date-taken');
        this.metaSoftware = document.getElementById('meta-software');
        this.metaDateAcquired = document.getElementById('meta-date-acquired');
        this.metaCopyright = document.getElementById('meta-copyright');

        this.statusText = document.getElementById('status-text');
        this.progressPercent = document.getElementById('progress-percent');
        this.progressFill = document.getElementById('progress-fill');

        this.gallery = new GalleryUI(document.getElementById('gallery'), (count) => {
            this.downloadBtn.disabled = count === 0;
            this.downloadBtn.textContent = count > 0 ? `Download (${count})` : 'Download';
        });

        this.widthSlider = new DualSlider(document.getElementById('width-filter'), () => this.handleFilterChange());
        this.heightSlider = new DualSlider(document.getElementById('height-filter'), () => this.handleFilterChange());

        this.initListeners();
        this.init();
    }

    async init() {
        const config = await StorageManager.loadConfig();
        
        this.subfolderInput.value = config.subfolder || '';
        this.formatSelect.value = config.format || 'original';

        // Ładowanie zapisanych metadanych
        if (config.metadata) {
            this.metaTitle.value = config.metadata.title || '';
            this.metaRating.value = config.metadata.rating || '0';
            this.metaTags.value = config.metadata.tags || '';
            this.metaComments.value = config.metadata.comments || '';
            this.metaAuthors.value = config.metadata.authors || '';
            this.metaDateTaken.value = config.metadata.dateTaken || '';
            this.metaSoftware.value = config.metadata.software || '';
            this.metaDateAcquired.value = config.metadata.dateAcquired || '';
            this.metaCopyright.value = config.metadata.copyright || '';
        }

        this.widthSlider.setValues(config.minW, config.maxW);
        this.heightSlider.setValues(config.minH, config.maxH);

        await this.extractImagesFromPage();
    }

    initListeners() {
        this.subfolderInput.addEventListener('input', () => this.saveCurrentState());
        this.formatSelect.addEventListener('change', () => this.saveCurrentState());
        this.downloadBtn.addEventListener('click', () => this.executeDownload());

        if (this.openMetaBtn && this.metaModal) {
            this.openMetaBtn.addEventListener('click', () => this.metaModal.classList.add('active'));
            this.metaCancelBtn.addEventListener('click', () => this.metaModal.classList.remove('active'));
            this.metaSaveBtn.addEventListener('click', () => {
                this.saveCurrentState();
                this.metaModal.classList.remove('active');
            });

            // Automatyczny zapis dla wszystkich pól
            const inputs = [
                this.metaTitle, this.metaRating, this.metaTags, this.metaComments,
                this.metaAuthors, this.metaDateTaken, this.metaSoftware,
                this.metaDateAcquired, this.metaCopyright
            ];
            inputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => this.saveCurrentState());
                    input.addEventListener('change', () => this.saveCurrentState());
                }
            });
        }
    }

    updateProgress(text, percent) {
        this.statusText.textContent = text;
        this.progressPercent.textContent = `${percent}%`;
        this.progressFill.style.width = `${percent}%`;
    }

    async extractImagesFromPage() {
        try {
            this.updateProgress('Skanowanie aktywnej karty...', 50);
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!activeTab.url || activeTab.url.startsWith('chrome://')) {
                this.updateProgress('Nieobsługiwany URL strony', 100);
                return;
            }

            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id, allFrames: true },
                files: ['js/content.js']
            });

            const allImages = [];
            if (injectionResults) {
                for (const frame of injectionResults) {
                    if (frame.result) allImages.push(...frame.result);
                }
            }
            
            this.gallery.setImages(allImages);
            this.handleFilterChange();
            this.updateProgress('Zakończono pomyślnie', 100);
        } catch (e) {
            console.error('Błąd ekstrakcji:', e);
            this.updateProgress('Błąd ekstrakcji grafik', 100);
        }
    }

    handleFilterChange() {
        this.saveCurrentState();
        const w = this.widthSlider.getValues();
        const h = this.heightSlider.getValues();
        this.gallery.applyFilter({ minW: w.min, maxW: w.max, minH: h.min, maxH: h.max });
    }

    saveCurrentState() {
        const w = this.widthSlider.getValues();
        const h = this.heightSlider.getValues();
        StorageManager.saveConfig({
            minW: w.min, maxW: w.max, 
            minH: h.min, maxH: h.max,
            subfolder: this.subfolderInput.value.trim(), 
            format: this.formatSelect.value,
            metadata: {
                title: this.metaTitle ? this.metaTitle.value.trim() : '',
                rating: this.metaRating ? this.metaRating.value : '0',
                tags: this.metaTags ? this.metaTags.value.trim() : '',
                comments: this.metaComments ? this.metaComments.value.trim() : '',
                authors: this.metaAuthors ? this.metaAuthors.value.trim() : '',
                dateTaken: this.metaDateTaken ? this.metaDateTaken.value : '',
                software: this.metaSoftware ? this.metaSoftware.value.trim() : '',
                dateAcquired: this.metaDateAcquired ? this.metaDateAcquired.value : '',
                copyright: this.metaCopyright ? this.metaCopyright.value.trim() : ''
            }
        });
    }

    async executeDownload() {
        const selected = this.gallery.getSelectedImages();
        if (selected.length === 0) return;

        this.downloadBtn.disabled = true;
        const config = await StorageManager.loadConfig();

        this.progressFill.classList.add('active-loading');
        this.updateProgress(`Pobieranie ${selected.length} plików w tle...`, 100);

        chrome.runtime.sendMessage({
            action: "startBackgroundDownload",
            items: selected,
            subfolder: config.subfolder,
            metadata: config.metadata
        });

        setTimeout(() => {
            this.downloadBtn.disabled = false;
            this.downloadBtn.textContent = `Pobrano (${selected.length})`;
            this.progressFill.classList.remove('active-loading');
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => new DownloaderUI());