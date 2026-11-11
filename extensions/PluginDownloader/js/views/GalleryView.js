/**
 * @file GalleryView.js
 * @description Widok siatki kafelków, etykiet wymiarów, formatów oraz statystyk.
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

  #bindEvents(onCardClick, onSelectAllToggle) {
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
   * Przebudowuje siatkę miniaturek od zera.
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
        <span class="format-badge">${item.format || 'IMG'}</span>
        <img src="${item.url}" loading="lazy" alt="Miniatura">
        <div class="dimensions">${item.width}x${item.height}</div>
      `;
      fragment.appendChild(card);
    });

    this.container.appendChild(fragment);
  }

  /**
   * Aktualizuje widoczność i zaznaczenie istniejących kafelków.
   * @param {import('../models/ImageModel.js').GalleryItem[]} items
   */
  updateCardStates(items) {
    const cardMap = new Map();
    this.container.querySelectorAll('.image-card').forEach((el) => {
      const card = /** @type {HTMLElement} */ (el);
      if (card.dataset.id) cardMap.set(card.dataset.id, card);
    });

    items.forEach((item) => {
      const card = cardMap.get(item.id);
      if (!card) return;

      card.classList.toggle('hidden', !item.isVisible);
      card.classList.toggle('selected', item.selected);

      const dim = card.querySelector('.dimensions');
      if (dim) {
        dim.textContent = `${item.width}x${item.height}`;
      }
    });
  }

  /**
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