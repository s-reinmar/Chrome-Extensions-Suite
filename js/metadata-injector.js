/**
 * Narzędzie do binarnego wstrzykiwania bloków tEXt do plików PNG w czystym JS.
 */
class PngMetadataInjector {
    /**
     * @param {ArrayBuffer} buffer 
     * @param {{title?: string, authors?: string, tags?: string}} meta 
     * @returns {Blob}
     */
    static inject(buffer, meta) {
        const uint8 = new Uint8Array(buffer);
        // Sprawdzamy sygnaturę PNG (\x89PNG\r\n\x1a\n)
        const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47;
        if (!isPng) {
            return new Blob([buffer], { type: 'image/jpeg' });
        }

        // Bloki do wstrzyknięcia po nagłówku IHDR (zwykle offset 33 bajtów)
        const chunks = [];
        if (meta.title) chunks.push(this.createChunk('Title', meta.title));
        if (meta.authors) chunks.push(this.createChunk('Author', meta.authors));
        if (meta.tags) {
            chunks.push(this.createChunk('Description', meta.tags));
            chunks.push(this.createChunk('Comment', meta.tags));
        }

        // Znajdź koniec nagłówka IHDR (8 bajtów sygnatury + 4 length + 4 IHDR + 13 data + 4 CRC = 33)
        const ihdrEnd = 33;
        const totalNewLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const finalArray = new Uint8Array(uint8.length + totalNewLength);

        // 1. Kopiuj sygnaturę i IHDR
        finalArray.set(uint8.subarray(0, ihdrEnd), 0);

        // 2. Wklej nowe chunki metadanych
        let currentOffset = ihdrEnd;
        for (const chunk of chunks) {
            finalArray.set(chunk, currentOffset);
            currentOffset += chunk.length;
        }

        // 3. Doklej pozostałą część PNG (IDAT, IEND)
        finalArray.set(uint8.subarray(ihdrEnd), currentOffset);

        return new Blob([finalArray], { type: 'image/png' });
    }

    /**
     * Tworzy chunk 'tEXt' (długość, typ, keyword + \0 + tekst, crc32)
     */
    static createChunk(keyword, text) {
        const enc = new TextEncoder();
        const kwBytes = enc.encode(keyword);
        const textBytes = enc.encode(text);
        const dataLength = kwBytes.length + 1 + textBytes.length; // +1 na bajt 0x00

        const chunkData = new Uint8Array(4 + 4 + dataLength + 4);
        const view = new DataView(chunkData.buffer);

        // Długość danych
        view.setUint32(0, dataLength, false);

        // Typ chunka: tEXt (0x74, 0x45, 0x58, 0x74)
        chunkData[4] = 0x74; chunkData[5] = 0x45; chunkData[6] = 0x58; chunkData[7] = 0x74;

        // Keyword
        chunkData.set(kwBytes, 8);
        chunkData[8 + kwBytes.length] = 0x00; // separator zerowy

        // Tekst
        chunkData.set(textBytes, 8 + kwBytes.length + 1);

        // Obliczenie CRC32 z (typ + dane)
        const crcPayload = chunkData.subarray(4, 8 + dataLength);
        const crcVal = this.crc32(crcPayload);
        view.setUint32(8 + dataLength, crcVal, false);

        return chunkData;
    }

    static crc32(buf) {
        let crc = -1;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ this.crcTable[(crc ^ buf[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }

    static get crcTable() {
        if (!this._crcTable) {
            this._crcTable = new Uint32Array(256);
            for (let i = 0; i < 256; i++) {
                let c = i;
                for (let k = 0; k < 8; k++) {
                    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                }
                this._crcTable[i] = c >>> 0;
            }
        }
        return this._crcTable;
    }
}