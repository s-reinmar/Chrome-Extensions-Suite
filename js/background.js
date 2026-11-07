/**
 * @file background.js
 * @description Service Worker obsługujący pobieranie w tle, odporny na zmianę karty.
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

    for (let i = 0; i < items.length; i++) {
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

                    // Nasłuchujemy zakończenia pobierania konkretnego pliku
                    const listener = (delta) => {
                        if (delta.id === downloadId) {
                            if (delta.state && delta.state.current === 'complete') {
                                chrome.downloads.onChanged.removeListener(listener);
                                successCount++;
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

    // Informujemy popup (jeśli jest otwarty), że zakończono
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