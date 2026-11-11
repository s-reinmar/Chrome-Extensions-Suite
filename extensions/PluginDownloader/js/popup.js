/**
 * @file popup.js
 * @description Główny punkt wejścia (bootstrap) modułu Popup.
 */

import { ImageModel } from './models/ImageModel.js';
import { GalleryView } from './views/GalleryView.js';
import { ProgressView } from './views/components/ProgressView.js';
import { DownloadOptionsView } from './views/components/DownloadOptionsView.js';
import { MetadataModalView } from './views/components/MetadataModalView.js';
import { PopupController } from './controllers/PopupController.js';

document.addEventListener('DOMContentLoaded', () => {
  const model = new ImageModel();
  const progressView = new ProgressView();
  const downloadOptionsView = new DownloadOptionsView();
  const metadataModalView = new MetadataModalView();

  let controllerRef;

  const galleryView = new GalleryView(
    document.getElementById('gallery'),
    {
      onCardClick: (id) => controllerRef?.onCardClick(id),
      onSelectAllToggle: (checked) => controllerRef?.onSelectAllToggle(checked)
    }
  );

  controllerRef = new PopupController({
    model,
    galleryView,
    progressView,
    downloadOptionsView,
    metadataModalView
  });

  controllerRef.init();
});