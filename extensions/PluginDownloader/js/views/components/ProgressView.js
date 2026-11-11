/**
 * @file ProgressView.js
 * @description Komponent widoku obsługujący pasek postępu oraz etykietę statusu.
 */

export class ProgressView {
  constructor() {
    this.statusText = document.getElementById('status-text');
    this.progressPercent = document.getElementById('progress-percent');
    this.progressFill = document.getElementById('progress-fill');
  }

  /**
   * Aktualizuje wyświetlany status oraz procent postępu.
   * @param {string} text Komunikat statusu.
   * @param {number} percent Wartość od 0 do 100.
   */
  setProgress(text, percent) {
    const clampedPercent = Math.min(100, Math.max(0, percent));

    if (this.statusText) {
      this.statusText.textContent = text;
    }
    if (this.progressPercent) {
      this.progressPercent.textContent = `${clampedPercent}%`;
    }
    if (this.progressFill) {
      this.progressFill.style.width = `${clampedPercent}%`;
    }
  }

  /**
   * Włącza lub wyłącza animację aktywnego ładowania na pasku postępu.
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    if (this.progressFill) {
      this.progressFill.classList.toggle('active-loading', isLoading);
    }
  }
}