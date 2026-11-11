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
      let minVal = parseInt(this.minInput.value, 10);
      let maxVal = parseInt(this.maxInput.value, 10);

      // Zapobieganie przecięciu wartości min i max
      if (minVal > maxVal) {
        const tmp = minVal;
        minVal = maxVal;
        maxVal = tmp;
        this.minInput.value = String(minVal);
        this.maxInput.value = String(maxVal);
      }

      const maxLimit = parseInt(this.maxInput.max, 10) || 3000;
      this.minDisplay.textContent = `${minVal}px`;
      this.maxDisplay.textContent = maxVal >= maxLimit ? 'MAX' : `${maxVal}px`;

      const minPercent = (minVal / maxLimit) * 100;
      const maxPercent = (maxVal / maxLimit) * 100;

      this.rangeVisual.style.left = `${minPercent}%`;
      this.rangeVisual.style.width = `${maxPercent - minPercent}%`;

      if (typeof this.onChange === 'function') {
        this.onChange(this.getValues());
      }
    };
    
    this.minInput.addEventListener('input', handleUpdate);
    this.maxInput.addEventListener('input', handleUpdate);
  }

  /**
   * Ustawia wartości suwaków i synchronizuje widok.
   * @param {number} min
   * @param {number} max
   */
  setValues(min, max) {
    this.minInput.value = String(min);
    this.maxInput.value = String(max);
    this.minInput.dispatchEvent(new Event('input'));
  }

  /**
   * Pobiera aktualne wartości suwaków.
   * @returns {SliderRangeValues}
   */
  getValues() {
    return {
      min: parseInt(this.minInput.value, 10),
      max: parseInt(this.maxInput.value, 10)
    };
  }
}