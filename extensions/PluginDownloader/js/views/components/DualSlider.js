/**
 * @file DualSlider.js
 * @description Komponent podwójnego suwaka (zakres min-max) dla filtrów wymiarów.
 */

/**
 * @typedef {Object} SliderRangeValues
 * @property {number} min
 * @property {number} max
 */

/**
 * @callback SliderChangeCallback
 * @param {SliderRangeValues} values
 * @returns {void}
 */

export class DualSlider {
  /**
   * @param {HTMLElement} root Element nadrzędny zawierający kontrolki suwaka.
   * @param {SliderChangeCallback} onChangeCallback Callback wywoływany przy zmianie wartości.
   */
  constructor(root, onChangeCallback) {
    if (!root) {
      throw new Error('DualSlider: Brak elementu root.');
    }

    /** @type {HTMLInputElement} */
    this.minInput = root.querySelector('.min-input');
    /** @type {HTMLInputElement} */
    this.maxInput = root.querySelector('.max-input');
    /** @type {HTMLElement} */
    this.rangeVisual = root.querySelector('.slider-range');
    /** @type {HTMLElement} */
    this.minDisplay = root.querySelector('.min-val');
    /** @type {HTMLElement} */
    this.maxDisplay = root.querySelector('.max-val');

    /** @type {SliderChangeCallback} */
    this.onChange = onChangeCallback;

    this.#bindEvents();
  }

  /**
   * Inicjalizuje nasłuchiwanie zdarzeń na kontrolkach suwaka.
   * @private
   */
  #bindEvents() {
    const handleUpdate = () => {
      let minVal = parseInt(this.minInput.value, 10) || 0;
      let maxVal = parseInt(this.maxInput.value, 10) || 3000;

      // Zapobieganie przecięciu wartości min i max
      if (minVal > maxVal) {
        const tmp = minVal;
        minVal = maxVal;
        maxVal = tmp;
        this.minInput.value = String(minVal);
        this.maxInput.value = String(maxVal);
      }

      this.#updateDisplay(minVal, maxVal);

      if (typeof this.onChange === 'function') {
        this.onChange(this.getValues());
      }
    };

    this.minInput.addEventListener('input', handleUpdate);
    this.maxInput.addEventListener('input', handleUpdate);
  }

  /**
   * Aktualizuje pozycję wizualną i etykiety tekstowe.
   * @private
   */
  #updateDisplay(minVal, maxVal) {
    const maxLimit = parseInt(this.maxInput.max, 10) || 3000;
    const minLimit = parseInt(this.minInput.min, 10) || 0;
    const range = maxLimit - minLimit || 3000;

    if (this.minDisplay) {
      this.minDisplay.textContent = `${minVal}px`;
    }
    if (this.maxDisplay) {
      this.maxDisplay.textContent = maxVal >= maxLimit ? 'MAX' : `${maxVal}px`;
    }

    if (this.rangeVisual) {
      const minPercent = Math.max(0, Math.min(100, ((minVal - minLimit) / range) * 100));
      const maxPercent = Math.max(0, Math.min(100, ((maxVal - minLimit) / range) * 100));
      this.rangeVisual.style.left = `${minPercent}%`;
      this.rangeVisual.style.width = `${Math.max(0, maxPercent - minPercent)}%`;
    }
  }

  /**
   * Ustawia wartości suwaków i synchronizuje widok bez zapętlania zdarzeń.
   * @param {number} min
   * @param {number} max
   */
  setValues(min, max) {
    const minLimit = parseInt(this.minInput.min, 10) || 0;
    const maxLimit = parseInt(this.maxInput.max, 10) || 3000;

    const safeMin = Math.max(minLimit, Math.min(maxLimit, Number(min) || 0));
    const safeMax = Math.max(safeMin, Math.min(maxLimit, Number(max) || maxLimit));

    this.minInput.value = String(safeMin);
    this.maxInput.value = String(safeMax);

    this.#updateDisplay(safeMin, safeMax);
  }

  /**
   * Pobiera aktualne wartości suwaków.
   * @returns {SliderRangeValues}
   */
  getValues() {
    return {
      min: parseInt(this.minInput.value, 10) || 0,
      max: parseInt(this.maxInput.value, 10) || 3000
    };
  }
}