/**
 * @file DownloadManagerService.js
 * @description Orkiestrator kolejki pobierania z limitem równoległych żądań.
 */

import { FileNamingService } from './FileNamingService.js';
import { XmpInjectorService } from './XmpInjectorService.js';

export class DownloadManagerService {
  /**
   * Kolejka pobierania partiami (Concurrency Pool)
   * @param {Array<{ url: string }>} items
   * @param {string} subfolder
   * @param {Record<string, any>} metadata
   * @param {number} concurrencyLimit Liczba jednoczesnych pobrań (domyślnie 3)
   */
  static async processBatch(items, subfolder, metadata, concurrencyLimit = 3) {
    let currentIndex = 0;
    const total = items.length;

    const worker = async () => {
      while (currentIndex < total) {
        const item = items[currentIndex++];
        try {
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
        } catch (err) {
          console.warn(`Błąd podczas pobierania ${item.url}:`, err);
        }
      }
    };

    // Uruchom pulę równoległych workerów
    const workers = Array.from(
      { length: Math.min(concurrencyLimit, total) },
      () => worker()
    );

    await Promise.all(workers);
  }

  static async prepareDownloadUrl(url, metadata) {
    if (!metadata || !XmpInjectorService.hasAnyMetadata(metadata)) {
      return url;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = await response.arrayBuffer();
      // Jeśli plik to PNG, wstrzykujemy XMP/iTXt
      const modifiedBytes = XmpInjectorService.inject(buffer, metadata);
      return DownloadManagerService.toDataUrl(modifiedBytes);
    } catch {
      return url;
    }
  }

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
}