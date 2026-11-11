/**
 * @file background.js
 * @description Service Worker nasłuchujący zadań pobierania w tle.
 */

import { DownloadManagerService } from './services/DownloadManagerService.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startBackgroundDownload') {
    DownloadManagerService.processBatch(
      request.items || [],
      request.subfolder || '',
      request.metadata || {}
    );
    sendResponse({ status: 'started' });
  }
  return true;
});