/**
 * @file PngMetadataService.js
 * @description Serwis domenowy do binarnego wstrzykiwania bloków tEXt do plików PNG.
 */

class Crc32Calculator {
  /** @type {Uint32Array|null} */
  static #table = null;

  /**
   * Generuje i zwraca statyczną tablicę podglądu CRC32.
   * @returns {Uint32Array}
   */
  static get table() {
    if (!Crc32Calculator.#table) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      Crc32Calculator.#table = table;
    }
    return Crc32Calculator.#table;
  }

  /**
   * Oblicza sumę kontrolną CRC32 dla podanego bufora bajtów.
   * @param {Uint8Array} buffer
   * @returns {number}
   */
  static calculate(buffer) {
    let crc = -1;
    const table = Crc32Calculator.table;

    for (let i = 0; i < buffer.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xff];
    }

    return (crc ^ (-1)) >>> 0;
  }
}

/**
 * @typedef {Object} PngMetadataPayload
 * @property {string} [title]
 * @property {string} [authors]
 * @property {string} [tags]
 */

export class PngMetadataService {
  static PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
  static IHDR_END_OFFSET = 33; // 8 (sig) + 4 (len) + 4 (type) + 13 (data) + 4 (crc)

  /**
   * Sprawdza, czy bufor zawiera nagłówek PNG.
   * @param {Uint8Array} bytes
   * @returns {boolean}
   */
  static isPng(bytes) {
    return (
      bytes[0] === PngMetadataService.PNG_SIGNATURE[0] &&
      bytes[1] === PngMetadataService.PNG_SIGNATURE[1] &&
      bytes[2] === PngMetadataService.PNG_SIGNATURE[2] &&
      bytes[3] === PngMetadataService.PNG_SIGNATURE[3]
    );
  }

  /**
   * Tworzy binarny chunk tEXt (Length + ChunkType + Keyword + 0x00 + Text + CRC32).
   * @param {string} keyword
   * @param {string} text
   * @returns {Uint8Array}
   */
  static createTextChunk(keyword, text) {
    const encoder = new TextEncoder();
    const keywordBytes = encoder.encode(keyword);
    const textBytes = encoder.encode(text);
    const dataLength = keywordBytes.length + 1 + textBytes.length; // +1 na bajt zerowy null

    const chunk = new Uint8Array(12 + dataLength); // 4 (len) + 4 (type) + data + 4 (crc)
    const view = new DataView(chunk.buffer);

    // 1. Długość danych
    view.setUint32(0, dataLength, false);

    // 2. Typ 'tEXt' (0x74, 0x45, 0x58, 0x74)
    chunk[4] = 0x74;
    chunk[5] = 0x45;
    chunk[6] = 0x58;
    chunk[7] = 0x74;

    // 3. Keyword + separator 0x00 + treść tekstu
    chunk.set(keywordBytes, 8);
    chunk[8 + keywordBytes.length] = 0x00;
    chunk.set(textBytes, 8 + keywordBytes.length + 1);

    // 4. Suma kontrolna CRC32 (z typu i danych)
    const crcPayload = chunk.subarray(4, 8 + dataLength);
    const crc = Crc32Calculator.calculate(crcPayload);
    view.setUint32(8 + dataLength, crc, false);

    return chunk;
  }

  /**
   * Wstrzykuje metadane do pliku PNG w postaci chunków tEXt.
   * @param {ArrayBuffer} buffer
   * @param {PngMetadataPayload} meta
   * @returns {Blob}
   */
  static inject(buffer, meta = {}) {
    const uint8 = new Uint8Array(buffer);

    if (!PngMetadataService.isPng(uint8)) {
      return new Blob([buffer], { type: 'image/jpeg' });
    }

    const chunks = [];
    if (meta.title) chunks.push(PngMetadataService.createTextChunk('Title', meta.title));
    if (meta.authors) chunks.push(PngMetadataService.createTextChunk('Author', meta.authors));
    if (meta.tags) {
      chunks.push(PngMetadataService.createTextChunk('Description', meta.tags));
      chunks.push(PngMetadataService.createTextChunk('Comment', meta.tags));
    }

    const totalNewBytes = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const merged = new Uint8Array(uint8.length + totalNewBytes);

    // 1. Skopiuj nagłówek i IHDR
    merged.set(uint8.subarray(0, PngMetadataService.IHDR_END_OFFSET), 0);

    // 2. Wklej chunki tEXt
    let offset = PngMetadataService.IHDR_END_OFFSET;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // 3. Skopiuj pozostałą część obrazu (IDAT, IEND)
    merged.set(uint8.subarray(PngMetadataService.IHDR_END_OFFSET), offset);

    return new Blob([merged], { type: 'image/png' });
  }
}