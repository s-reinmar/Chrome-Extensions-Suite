/**
 * @file XmpInjectorService.js
 * @description Serwis wstrzykujący pakiety Adobe XMP / MicrosoftPhoto w chunkach iTXt formatu PNG.
 */

export class XmpInjectorService {
  static PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
  static IHDR_END_OFFSET = 33;
  static MS_RATING_MAP = { 0: 0, 1: 1, 2: 25, 3: 50, 4: 75, 5: 99 };

  /**
   * Sprawdza sygnaturę pliku PNG.
   * @param {Uint8Array} uint8
   * @returns {boolean}
   */
  static isPng(uint8) {
    return (
      uint8[0] === XmpInjectorService.PNG_SIGNATURE[0] &&
      uint8[1] === XmpInjectorService.PNG_SIGNATURE[1] &&
      uint8[2] === XmpInjectorService.PNG_SIGNATURE[2] &&
      uint8[3] === XmpInjectorService.PNG_SIGNATURE[3]
    );
  }

  /**
   * Weryfikuje, czy obiekt metadanych zawiera jakiekolwiek wartości niepuste.
   * @param {Record<string, any>} [meta]
   * @returns {boolean}
   */
  static hasAnyMetadata(meta) {
    if (!meta) return false;
    return !!(
      meta.title ||
      (meta.rating && meta.rating !== '0') ||
      meta.tags ||
      meta.comments ||
      meta.authors ||
      meta.dateTaken ||
      meta.software ||
      meta.dateAcquired ||
      meta.copyright
    );
  }

  /**
   * Zabezpiecza znaki specjalne dla formatu XML.
   * @param {string} unsafe
   * @returns {string}
   */
  static escapeXml(unsafe) {
    return (unsafe || '').replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Generuje strukturę RDF/XML pakietu XMP.
   * @param {Record<string, any>} meta
   * @returns {string}
   */
  static buildXmpXml(meta) {
    const title = meta.title || '';
    const rating = parseInt(meta.rating, 10) || 0;
    const tags = meta.tags ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const comments = meta.comments || '';
    const author = meta.authors || '';
    const dateTaken = meta.dateTaken ? `${meta.dateTaken}T12:00:00` : '';
    const dateAcquired = meta.dateAcquired ? `${meta.dateAcquired}T12:00:00` : '';
    const software = meta.software || '';
    const copyright = meta.copyright || '';
    const msRating = XmpInjectorService.MS_RATING_MAP[rating] || 0;

    return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:MicrosoftPhoto="http://ns.microsoft.com/photo/1.0/">
   ${title ? `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${XmpInjectorService.escapeXml(title)}</rdf:li></rdf:Alt></dc:title>` : ''}
   ${author ? `<dc:creator><rdf:Seq><rdf:li>${XmpInjectorService.escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>` : ''}
   ${comments ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${XmpInjectorService.escapeXml(comments)}</rdf:li></rdf:Alt></dc:description>` : ''}
   ${copyright ? `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${XmpInjectorService.escapeXml(copyright)}</rdf:li></rdf:Alt></dc:rights>` : ''}
   ${rating > 0 ? `<xmp:Rating>${rating}</xmp:Rating>` : ''}
   ${msRating > 0 ? `<MicrosoftPhoto:Rating>${msRating}</MicrosoftPhoto:Rating>` : ''}
   ${tags.length > 0 ? `
   <dc:subject>
    <rdf:Bag>${tags.map((t) => `<rdf:li>${XmpInjectorService.escapeXml(t)}</rdf:li>`).join('')}</rdf:Bag>
   </dc:subject>
   <MicrosoftPhoto:LastKeywordXMP>
    <rdf:Bag>${tags.map((t) => `<rdf:li>${XmpInjectorService.escapeXml(t)}</rdf:li>`).join('')}</rdf:Bag>
   </MicrosoftPhoto:LastKeywordXMP>` : ''}
   ${dateTaken ? `<xmp:CreateDate>${dateTaken}</xmp:CreateDate>` : ''}
   ${software ? `<xmp:CreatorTool>${XmpInjectorService.escapeXml(software)}</xmp:CreatorTool>` : ''}
   ${dateAcquired ? `<MicrosoftPhoto:DateAcquired>${dateAcquired}</MicrosoftPhoto:DateAcquired>` : ''}
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
  }

  /**
   * Tworzy binarny blok iTXt (International Textual Data) dla PNG.
   * @param {string} keyword
   * @param {string} text
   * @returns {Uint8Array}
   */
  static createITXtChunk(keyword, text) {
    const enc = new TextEncoder();
    const kwBytes = enc.encode(keyword);
    const textBytes = enc.encode(text);

    // Długość: keyword + 5 bajtów flag i separatorów (0, 0, 0, 0, 0) + tekst
    const dataLength = kwBytes.length + 5 + textBytes.length;
    const totalLength = 12 + dataLength; // 4 (len) + 4 (type) + data + 4 (crc)
    const chunk = new Uint8Array(totalLength);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, dataLength, false);
    chunk[4] = 0x69; chunk[5] = 0x54; chunk[6] = 0x58; chunk[7] = 0x74; // 'iTXt'

    let pos = 8;
    chunk.set(kwBytes, pos);
    pos += kwBytes.length;

    // Flagi kompresji (0), metoda (0), tag języka pusty (0), przetłumaczone słowo puste (0, 0)
    chunk[pos++] = 0;
    chunk[pos++] = 0;
    chunk[pos++] = 0;
    chunk[pos++] = 0;
    chunk[pos++] = 0;

    chunk.set(textBytes, pos);
    pos += textBytes.length;

    const crc = XmpInjectorService.crc32(chunk.subarray(4, 8 + dataLength));
    view.setUint32(pos, crc, false);

    return chunk;
  }

  /**
   * Oblicza sumę kontrolną CRC32.
   * @param {Uint8Array} buf
   * @returns {number}
   */
  static crc32(buf) {
    let crc = -1;
    const table = XmpInjectorService.#getCrcTable();
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  static #crcTable = null;
  static #getCrcTable() {
    if (!XmpInjectorService.#crcTable) {
      const table = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
      }
      XmpInjectorService.#crcTable = table;
    }
    return XmpInjectorService.#crcTable;
  }

  /**
   * Wstrzykuje metadane XMP do bufora binarnego PNG.
   * @param {ArrayBuffer} buffer
   * @param {Record<string, any>} meta
   * @returns {Uint8Array}
   */
  static inject(buffer, meta) {
    const uint8 = new Uint8Array(buffer);
    if (!XmpInjectorService.isPng(uint8)) {
      return uint8;
    }

    const xmpXml = XmpInjectorService.buildXmpXml(meta);
    const chunk = XmpInjectorService.createITXtChunk('XML:com.adobe.xmp', xmpXml);

    const result = new Uint8Array(uint8.length + chunk.length);
    result.set(uint8.subarray(0, XmpInjectorService.IHDR_END_OFFSET), 0);
    result.set(chunk, XmpInjectorService.IHDR_END_OFFSET);
    result.set(
      uint8.subarray(XmpInjectorService.IHDR_END_OFFSET),
      XmpInjectorService.IHDR_END_OFFSET + chunk.length
    );

    return result;
  }
}