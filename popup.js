class StorageManager {
    static async loadConfig() {
        return new Promise(resolve => {
            chrome.storage.local.get(['downloaderConfig'], (result) => {
                resolve(result.downloaderConfig || { minW: 0, maxW: 3000, minH: 0, maxH: 3000, subfolder: '', format: 'original' });
            });
        });
    }
    static saveConfig(config) { 
        chrome.storage.local.set({ downloaderConfig: config }); 
    }
}

class DownloadService {
    static async trigger(url, filename) {
        return new Promise((resolve) => {
            chrome.downloads.download({ url: url, filename: filename, saveAs: false }, () => {
                resolve(!chrome.runtime.lastError);
            });
        });
    }
}

class ImageFilter {
    static matches(img, config) {
        const wValid = img.width >= config.minW && (config.maxW >= 3000 || img.width <= config.maxW);
        const hValid = img.height >= config.minH && (config.maxH >= 3000 || img.height <= config.maxH);
        return wValid && hValid;
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
            const isMatch = ImageFilter.matches(item, config);
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
        const selectedCount = visible.filter(i => i.selected && !i.element.classList.contains('hidden')).length;

        this.statMatching.textContent = `${visible.length} matching`;
        this.statFiltered.textContent = `${hiddenCount} filtered out`;
        this.statSelected.textContent = `${selectedCount} selected`;
        
        this.selectAllCb.checked = visible.length > 0 && selectedCount === visible.length;
        this.onSelectionCommandInternal = selectedCount;
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
        this.batchFileInput = document.getElementById('batch-file');
        this.batchInfo = document.getElementById('batch-info');
        
        this.batchUrls = [];

        this.gallery = new GalleryUI(document.getElementById('gallery'), (count) => {
            this.downloadBtn.disabled = count === 0;
            this.downloadBtn.textContent = count > 0 ? `Download (${count})` : 'Download';
        });

        this.widthSlider = new DualSlider(document.getElementById('width-filter'), () => this.handleFilterChange());
        this.heightSlider = new DualSlider(document.getElementById('height-filter'), () => this.handleFilterChange());

        this.init();
    }

    async init() {
        const config = await StorageManager.loadConfig();
        
        this.subfolderInput.value = config.subfolder || '';
        this.formatSelect.value = config.format || 'original';

        this.subfolderInput.addEventListener('input', () => this.saveCurrentState());
        this.formatSelect.addEventListener('change', () => this.saveCurrentState());
        this.downloadBtn.addEventListener('click', () => this.executeDownload());
        this.batchFileInput.addEventListener('change', (e) => this.handleBatchFile(e));

        this.widthSlider.setValues(config.minW, config.maxW);
        this.heightSlider.setValues(config.minH, config.maxH);

        await this.extractImagesFromPage();
    }

    async handleBatchFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.batchInfo.textContent = `Wczytywanie: ${file.name}...`;
        try {
            const text = await file.text();
            this.batchUrls = text.split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            this.batchInfo.textContent = `Załadowano URLs: ${this.batchUrls.length}`;
            if (this.batchUrls.length > 0) {
                await this.extractImagesFromBatchUrls();
            }
        } catch (err) {
            console.error('Błąd parsowania pliku TXT:', err);
            this.batchInfo.textContent = 'Błąd odczytu pliku!';
        }
    }

    async extractImagesFromBatchUrls() {
        try {
            this.downloadBtn.disabled = true;
            this.downloadBtn.textContent = 'Skanowanie stron...';
            const allImages = [];

            for (const url of this.batchUrls) {
                try {
                    // Tworzymy ukrytą kartę do pobrania grafik ze wskazanych linków
                    const tab = await chrome.tabs.create({ url: url, active: false });
                    
                    // Czekaj na załadowanie strony
                    await new Promise(resolve => {
                        const listener = (tabId, info) => {
                            if (tabId === tab.id && info.status === 'complete') {
                                chrome.tabs.onUpdated.removeListener(listener);
                                resolve(true);
                            }
                        };
                        chrome.tabs.onUpdated.addListener(listener);
                    });

                    // Wstrzyknij skrypt ekstrakcji
                    const injectionResults = await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: true },
                        files: ['content.js']
                    });

                    if (injectionResults) {
                        for (const frame of injectionResults) {
                            if (frame.result) allImages.push(...frame.result);
                        }
                    }

                    // Zamknij tymczasową kartę
                    await chrome.tabs.remove(tab.id);
                } catch (subErr) {
                    console.warn(`Nie udało się przetworzyć URL: ${url}`, subErr);
                }
            }

            this.gallery.setImages(allImages);
            this.handleFilterChange();
        } catch (e) {
            console.error('Błąd skanowania wsadowego:', e);
        }
    }

    async extractImagesFromPage() {
        if (this.batchUrls.length > 0) return; // Jeśli załadowano plik, pomijamy domyślną kartę
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!activeTab.url || activeTab.url.startsWith('chrome://')) return;

            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id, allFrames: true },
                files: ['content.js']
            });

            const allImages = [];
            for (const frame of injectionResults) {
                if (frame.result) allImages.push(...frame.result);
            }
            
            this.gallery.setImages(allImages);
            this.handleFilterChange();
        } catch (e) {
            console.error('Błąd ekstrakcji:', e);
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
            format: this.formatSelect.value
        });
    }

    async executeDownload() {
        const selected = this.gallery.getSelectedImages();
        if (selected.length === 0) return;

        this.downloadBtn.disabled = true;
        this.downloadBtn.textContent = 'Pobieranie...';
        const config = await StorageManager.loadConfig();
        
        let successCount = 0;
        for (const item of selected) {
            let downloadUrl = item.url;
            let filename = this.generateSafeFilename(item.url, config.subfolder);
            
            if (config.format !== 'original') {
                try {
                    downloadUrl = await this.convertImageFormat(item.url, config.format);
                    filename = filename.replace(/\.[^/.]+$/, "") + "." + config.format;
                } catch (e) { 
                    console.warn('CORS błąd konwersji, pobieram oryginał');
                }
            }
            if (await DownloadService.trigger(downloadUrl, filename)) {
                successCount++;
            }
        }

        this.downloadBtn.textContent = `Pobrano: ${successCount}`;
        setTimeout(() => {
            this.gallery.updateStats();
        }, 3000);
    }

    generateSafeFilename(url, subfolder) {
        try {
            const urlObj = new URL(url);
            let filename = (urlObj.pathname.split('/').filter(Boolean).pop() || '').split('?')[0].replace(/[<>:"/\\|?*]+/g, '_');
            if (!filename || !filename.includes('.')) filename = `image_${Date.now()}.jpg`;
            const cleanSub = (subfolder || '').trim().replace(/[<>:"/\\|?*]+/g, '_');
            return cleanSub ? `${cleanSub}/${filename}` : filename;
        } catch (e) { return `image_${Date.now()}.jpg`; }
    }

    async convertImageFormat(url, format) {
        return new Promise((resolve, reject) => {
            const img = new Image(); 
            img.crossOrigin = "Anonymous"; 
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width; 
                canvas.height = img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob(b => b ? resolve(URL.createObjectURL(b)) : reject(), `image/${format}`);
            };
            img.onerror = reject; 
            img.src = url;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new DownloaderUI());