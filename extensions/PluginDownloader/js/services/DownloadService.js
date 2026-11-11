/**
 * @file DownloadService.js
 * @description Serwis odpowiedzialny za zlecanie pobierania plików w tle przez chrome.runtime.
 */

/**
 * @typedef {import('../models/ImageModel.js').GalleryItem} GalleryItem
 * @typedef {import('./StorageService.js').ExtensionMetadata} ExtensionMetadata
 */

/**
 * @typedef {Object} DownloadPayload
 * @property {GalleryItem[]} items Lista zaznaczonych obrazów do pobrania.
 * @property {string} subfolder Podkatalog docelowy.
 * @property {ExtensionMetadata} metadata Metadane do wstrzyknięcia.
 */

export class DownloadService {
  /**
   * Wysyła komunikat do Service Workera (background.js) inicjujący pobieranie grafik w tle.
   * @param {DownloadPayload} payload
   * @returns {Promise<{ success: boolean, [key: string]: any }>}
   */
  static async startDownload({ items, subfolder, metadata }) {
    if (!items || items.length === 0) {
      throw new Error('DownloadService: Brak elementów do pobrania.');
    }

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'startBackgroundDownload',
          items,
          subfolder: subfolder || '',
          metadata: metadata || {}
        },
        (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(response || { success: true });
        }
      );
    });
  }
}