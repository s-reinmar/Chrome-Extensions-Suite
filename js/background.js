/**
 * @file background.js
 * @description Service Worker obsługujący pobieranie w tle z raportowaniem postępu.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startBackgroundDownload") {
        processBackgroundDownloads(request.items, request.subfolder);
        sendResponse({ status: "started" });
    }
    return true;
});

async function processBackgroundDownloads(items, subfolder) {
    let successCount = 0;
    const totalItems = items.length;

    for (let i = 0; i < totalItems; i++) {
        const item = items[i];
        const filename = generateSafeFilename(item.url, subfolder);

        try {
            await new Promise((resolve) => {
                chrome.downloads.download({
                    url: item.url,
                    filename: filename,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError || !downloadId) {
                        resolve(false);
                        return;
                    }

                    const listener = (delta) => {
                        if (delta.id === downloadId) {
                            if (delta.state && delta.state.current === 'complete') {
                                chrome.downloads.onChanged.removeListener(listener);
                                successCount++;
                                
                                // Raportujemy pojedynczy postęp wraz z licznikiem i całością
                                chrome.runtime.sendMessage({
                                    action: "fileDownloaded",
                                    successCount: successCount,
                                    totalItems: totalItems
                                }).catch(() => {});

                                resolve(true);
                            } else if (delta.error || (delta.state && delta.state.current === 'interrupted')) {
                                chrome.downloads.onChanged.removeListener(listener);
                                resolve(false);
                            }
                        }
                    };
                    chrome.downloads.onChanged.addListener(listener);
                });
            });
        } catch (err) {
            console.warn(`Błąd pobierania pliku: ${item.url}`, err);
        }
    }

    chrome.runtime.sendMessage({
        action: "downloadFinished",
        successCount: successCount
    }).catch(() => {});
}

function generateSafeFilename(url, subfolder) {
    try {
        const urlObj = new URL(url);
        let filename = (urlObj.pathname.split('/').filter(Boolean).pop() || '').split('?')[0].replace(/[<>:"/\\|?*]+/g, '_');
        if (!filename || !filename.includes('.')) filename = `image_${Date.now()}.jpg`;
        const cleanSub = (subfolder || '').trim().replace(/[<>:"/\\|?*]+/g, '_');
        return cleanSub ? `${cleanSub}/${filename}` : filename;
    } catch (e) { 
        return `image_${Date.now()}.jpg`; 
    }
}