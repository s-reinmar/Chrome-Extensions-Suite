/**
 * @file StorageService.js
 * @description Moduł odpowiedzialny za persystencję danych w chrome.storage.local.
 */

/**
 * @typedef {Object} ExtensionMetadata
 * @property {string} title
 * @property {string} rating
 * @property {string} tags
 * @property {string} comments
 * @property {string} authors
 * @property {string} dateTaken
 * @property {string} software
 * @property {string} dateAcquired
 * @property {string} copyright
 */

/**
 * @typedef {Object} DownloaderConfig
 * @property {number} minW
 * @property {number} maxW
 * @property {number} minH
 * @property {number} maxH
 * @property {string} subfolder
 * @property {string} format
 * @property {ExtensionMetadata} metadata
 */

/** @type {DownloaderConfig} */
const DEFAULT_CONFIG = {
  minW: 0,
  maxW: 3000,
  minH: 0,
  maxH: 3000,
  subfolder: '',
  format: 'original',
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
};

export class StorageService {
  /**
   * Pobiera zapisaną konfigurację wtyczki lub zwraca wartości domyślne.
   * @returns {Promise<DownloaderConfig>}
   */
  static async loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['downloaderConfig'], (result) => {
        resolve(result.downloaderConfig || DEFAULT_CONFIG);
      });
    });
  }

  /**
   * Zapisuje bieżący stan konfiguracji wtyczki.
   * @param {DownloaderConfig} config
   * @returns {Promise<void>}
   */
  static async saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ downloaderConfig: config }, () => {
        resolve();
      });
    });
  }
}