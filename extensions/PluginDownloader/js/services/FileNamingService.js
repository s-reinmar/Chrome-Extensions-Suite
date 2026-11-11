/**
 * @file FileNamingService.js
 * @description Serwis odpowiedzialny za sanityzację ścieżek i generowanie bezpiecznych nazw plików.
 */

export class FileNamingService {
  static INVALID_CHARS_REGEX = /[<>:"/\\|?*]+/g;

  /**
   * Oczyszcza ciąg znaków z niedozwolonych znaków systemów plików Windows/Unix.
   * @param {string} name
   * @returns {string}
   */
  static sanitize(name) {
    return (name || '').trim().replace(FileNamingService.INVALID_CHARS_REGEX, '_');
  }

  /**
   * Generuje poprawną, bezpieczną ścieżkę zapisu wraz z ewentualnym podkatalogiem.
   * @param {string} url Adres źródłowy zasobu.
   * @param {string} [subfolder=''] Opcjonalny podfolder zapisu.
   * @returns {string}
   */
  static generateSafeFilename(url, subfolder = '') {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.split('/').filter(Boolean).pop() || '';
      let originalName = pathname.split('?')[0];

      originalName = FileNamingService.sanitize(originalName);

      if (!originalName || !originalName.includes('.')) {
        originalName = `image_${Date.now()}.png`;
      }

      const cleanSub = FileNamingService.sanitize(subfolder);
      return cleanSub ? `${cleanSub}/${originalName}` : originalName;
    } catch {
      return `image_${Date.now()}.png`;
    }
  }
}