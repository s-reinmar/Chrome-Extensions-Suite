/**
 * @file GalleryView.js
 * @description Warstwa widoku siatki grafik, checkboxa 'Zaznacz wszystkie' i liczników.
 */

export class GalleryView {
  /**
   * @param {HTMLElement} container Kontener na kafelki galerii (#gallery).
   * @param {Object} callbacks
   * @param {(id: string) => void} callbacks.onCardClick
   * @param {(checked: boolean) => void} callbacks.onSelectAllToggle
   */
  constructor(container, { onCardClick, onSelectAllToggle }) {
    if (!container) {
      throw new Error('GalleryView: Nie znaleziono kontenera galerii.');
    }

    this.container = container;
    this.selectAllCb = /** @type {HTMLInputElement} */ (document.getElementById('select-all-cb'));
    this.statMatching = document.getElementById('stat-matching');
    this.statFiltered = document.getElementById('stat-filtered');
    this.statSelected = document.getElementById('stat-selected');

    this.#bindEvents(onCardClick, onSelectAllToggle);
  }

  /**
   * Rejestruje delegację zdarzeń dla siatki miniatur i checkboxa głównego.
   * @private
   */
  #bindEvents(onCardClick, onSelectAllToggle) {
    // Efektywna delegacja zdarzeń zamiast pojedynczych listenerów na każdym kafelku
    this.container.addEventListener('click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const card = target.closest('.image-card');
      if (card && card.dataset.id && !card.classList.contains('hidden')) {
        onCardClick(card.dataset.id);
      }
    });

    this.selectAllCb?.addEventListener('change', (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      onSelectAllToggle(target.checked);
    });
  }

  /**
   * Renderuje karty obrazów w kontenerze przy użyciu DocumentFragment.
   * @param {import('../models/ImageModel.js').GalleryItem[]} items
   */
  renderImages(items) {
    this.container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = `image-card ${item.selected ? 'selected' : ''}`;
      card.dataset.id = item.id;
      card.innerHTML = `
        <img src="${item.url}" loading="lazy" alt="Image thumbnail">
        <div class="dimensions">${item.width}x${item.height}</div>
      `;
      fragment.appendChild(card);
    });

    this.container.appendChild(fragment);
  }

  /**
   * Aktualizuje widoczność i stan kafelków na podstawie modelu bez ponownego generowania DOM.
   * @param {import('../models/ImageModel.js').GalleryItem[]} items
   */
  updateCardStates(items) {
  const cardMap = new Map();
  this.container.querySelectorAll('.image-card').forEach((el) => {
    if (el.dataset.id) cardMap.set(el.dataset.id, el);
  });

  items.forEach((item) => {
    const card = cardMap.get(item.id);
    if (!card) return;

    card.classList.toggle('hidden', !item.isVisible);
    card.classList.toggle('selected', item.selected);

    // Aktualizacja napisu pikseli na kafelku
    const dimEl = card.querySelector('.dimensions');
    if (dimEl) {
      dimEl.textContent = `${item.width}x${item.height}`;
    }
  });
}

  /**
   * Aktualizuje etykiety statystyk oraz stan checkboxa "zaznacz wszystkie".
   * @param {import('../models/ImageModel.js').GalleryStats} stats
   */
  updateStats(stats) {
    if (this.statMatching) {
      this.statMatching.textContent = `${stats.visible} matching`;
    }
    if (this.statFiltered) {
      this.statFiltered.textContent = `${stats.hidden} filtered out`;
    }
    if (this.statSelected) {
      this.statSelected.textContent = `${stats.selected} selected`;
    }

    if (this.selectAllCb) {
      this.selectAllCb.checked = stats.visible > 0 && stats.selected === stats.visible;
    }
  }
}