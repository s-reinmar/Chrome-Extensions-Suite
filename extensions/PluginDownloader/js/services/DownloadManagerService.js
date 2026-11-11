/**
 * @file DownloadManagerService.js
 * @description Orkiestrator pobierania wsadowego z opcjonalną modyfikacją binarną metadanych.
 */

import { FileNamingService } from './FileNamingService.js';
import { XmpInjectorService } from './XmpInjectorService.js';

export class DownloadManagerService {
  /**
   * Konwertuje tablicę bajtów na ciąg Data URL (base64) partiami, aby uniknąć przepełnienia stosu.
   * @param {Uint8Array} uint8Array
   * @returns {string}
   */
  static toDataUrl(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    const chunkSize = 8192;

    for (let i = 0; i < len; i += chunkSize) {
      const sub = uint8Array.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, sub);
    }

    return `data:image/png;base64,${btoa(binary)}`;
  }

  /**
   * Pobiera pojedynczy plik i ewentualnie wstrzykuje metadane.
   * @param {string} url
   * @param {Record<string, any>} metadata
   * @returns {Promise<string>} Końcowy URL do pobrania (Data URL lub oryginalny).
   */
  static async prepareDownloadUrl(url, metadata) {
    if (!metadata || !XmpInjectorService.hasAnyMetadata(metadata)) {
      return url;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      const modifiedBytes = XmpInjectorService.inject(buffer, metadata);
      return DownloadManagerService.toDataUrl(modifiedBytes);
    } catch (err) {
      console.warn(`Fallback na oryginalny URL dla ${url}:`, err);
      return url;
    }
  }

  /**
   * Uruchamia sekwencyjne pobieranie kolekcji plików przez API downloads.
   * @param {Array<{ url: string }>} items
   * @param {string} subfolder
   * @param {Record<string, any>} metadata
   * @returns {Promise<void>}
   */
  static async processBatch(items, subfolder, metadata) {
    for (const item of items) {
      const targetFilename = FileNamingService.generateSafeFilename(item.url, subfolder);
      const downloadUrl = await DownloadManagerService.prepareDownloadUrl(item.url, metadata);

      await new Promise((resolve) => {
        chrome.downloads.download(
          {
            url: downloadUrl,
            filename: targetFilename,
            saveAs: false
          },
          () => resolve(true)
        );
      });
    }
  }
}