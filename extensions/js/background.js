/**
 * @file background.js
 * @description Service Worker pobierający pliki, zachowujący strukturę folderów oraz
 * wstrzykujący pełne metadane Windows (Tytuł, Rating, Tagi, Komentarze, Autorzy, Daty, Prawa).
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startBackgroundDownload") {
        processBatch(request.items, request.subfolder, request.metadata);
        sendResponse({ status: "started" });
    }
    return true;
});

async function processBatch(items, subfolder, metadata) {
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i++) {
        const item = items[i];
        const targetFilename = generateSafeFilename(item.url, subfolder);
        let downloadUrl = item.url;

        if (metadata && hasAnyMetadata(metadata)) {
            try {
                const response = await fetch(item.url);
                if (response.ok) {
                    const buffer = await response.arrayBuffer();
                    const modifiedBytes = XmpMetadataInjector.inject(buffer, metadata);
                    downloadUrl = uint8ToDataUrl(modifiedBytes);
                }
            } catch (err) {
                console.warn(`Fallback na oryginalny URL dla ${item.url}:`, err);
                downloadUrl = item.url;
            }
        }

        await new Promise((resolve) => {
            chrome.downloads.download({
                url: downloadUrl,
                filename: targetFilename,
                saveAs: false
            }, () => {
                resolve(true);
            });
        });
    }
}

function hasAnyMetadata(m) {
    return !!(m.title || (m.rating && m.rating !== '0') || m.tags || m.comments || 
              m.authors || m.dateTaken || m.software || m.dateAcquired || m.copyright);
}

function generateSafeFilename(url, subfolder) {
    try {
        const urlObj = new URL(url);
        let originalName = (urlObj.pathname.split('/').filter(Boolean).pop() || '').split('?')[0];
        originalName = originalName.replace(/[<>:"/\\|?*]+/g, '_');

        if (!originalName || !originalName.includes('.')) {
            originalName = `image_${Date.now()}.png`;
        }

        const cleanSub = (subfolder || '').trim().replace(/[<>:"/\\|?*]+/g, '_');
        return cleanSub ? `${cleanSub}/${originalName}` : originalName;
    } catch (e) {
        return `image_${Date.now()}.png`;
    }
}

class XmpMetadataInjector {
    static inject(buffer, meta) {
        const uint8 = new Uint8Array(buffer);
        const isPng = uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47;

        if (!isPng) return uint8;

        const title = meta.title || '';
        const rating = parseInt(meta.rating, 10) || 0;
        const tags = meta.tags ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        const comments = meta.comments || '';
        const author = meta.authors || '';
        const dateTaken = meta.dateTaken ? `${meta.dateTaken}T12:00:00` : '';
        const dateAcquired = meta.dateAcquired ? `${meta.dateAcquired}T12:00:00` : '';
        const software = meta.software || '';
        const copyright = meta.copyright || '';

        // Mapowanie gwiazdek (1-5) na skalę MicrosoftPhoto (1, 25, 50, 75, 99)
        const msRatingMap = { 0: 0, 1: 1, 2: 25, 3: 50, 4: 75, 5: 99 };
        const msRating = msRatingMap[rating] || 0;

        const xmpXml = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:MicrosoftPhoto="http://ns.microsoft.com/photo/1.0/">
   
   <!-- Tytuł -->
   ${title ? `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(title)}</rdf:li></rdf:Alt></dc:title>` : ''}
   
   <!-- Autorzy -->
   ${author ? `<dc:creator><rdf:Seq><rdf:li>${escapeXml(author)}</rdf:li></rdf:Seq></dc:creator>` : ''}
   
   <!-- Komentarze -->
   ${comments ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(comments)}</rdf:li></rdf:Alt></dc:description>` : ''}
   
   <!-- Prawa autorskie -->
   ${copyright ? `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(copyright)}</rdf:li></rdf:Alt></dc:rights>` : ''}

   <!-- Klasyfikacja (Gwiazdki 0-5) -->
   ${rating > 0 ? `<xmp:Rating>${rating}</xmp:Rating>` : ''}
   ${msRating > 0 ? `<MicrosoftPhoto:Rating>${msRating}</MicrosoftPhoto:Rating>` : ''}

   <!-- Tagi -->
   ${tags.length > 0 ? `
   <dc:subject>
    <rdf:Bag>${tags.map(t => `<rdf:li>${escapeXml(t)}</rdf:li>`).join('')}</rdf:Bag>
   </dc:subject>
   <MicrosoftPhoto:LastKeywordXMP>
    <rdf:Bag>${tags.map(t => `<rdf:li>${escapeXml(t)}</rdf:li>`).join('')}</rdf:Bag>
   </MicrosoftPhoto:LastKeywordXMP>` : ''}

   <!-- Daty i Program -->
   ${dateTaken ? `<xmp:CreateDate>${dateTaken}</xmp:CreateDate>` : ''}
   ${software ? `<xmp:CreatorTool>${escapeXml(software)}</xmp:CreatorTool>` : ''}
   ${dateAcquired ? `<MicrosoftPhoto:DateAcquired>${dateAcquired}</MicrosoftPhoto:DateAcquired>` : ''}

  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;

        const chunk = this.createITXtChunk("XML:com.adobe.xmp", xmpXml);
        const ihdrEnd = 33;
        const result = new Uint8Array(uint8.length + chunk.length);
        result.set(uint8.subarray(0, ihdrEnd), 0);
        result.set(chunk, ihdrEnd);
        result.set(uint8.subarray(ihdrEnd), ihdrEnd + chunk.length);

        return result;
    }

    static createITXtChunk(keyword, text) {
        const enc = new TextEncoder();
        const kwBytes = enc.encode(keyword);
        const textBytes = enc.encode(text);

        const dataLength = kwBytes.length + 1 + 1 + 1 + 1 + 1 + textBytes.length;
        const totalLength = 4 + 4 + dataLength + 4;
        const chunk = new Uint8Array(totalLength);
        const view = new DataView(chunk.buffer);

        view.setUint32(0, dataLength, false);
        chunk[4] = 0x69; chunk[5] = 0x54; chunk[6] = 0x58; chunk[7] = 0x74; // iTXt

        let pos = 8;
        chunk.set(kwBytes, pos);
        pos += kwBytes.length;
        chunk[pos++] = 0;
        chunk[pos++] = 0;
        chunk[pos++] = 0;
        chunk[pos++] = 0;
        chunk[pos++] = 0;

        chunk.set(textBytes, pos);
        pos += textBytes.length;

        const crc = this.crc32(chunk.subarray(4, 4 + 4 + dataLength));
        view.setUint32(pos, crc, false);

        return chunk;
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

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function uint8ToDataUrl(uint8Array) {
    let binary = '';
    const len = uint8Array.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        const sub = uint8Array.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, sub);
    }
    return `data:image/png;base64,${btoa(binary)}`;
}