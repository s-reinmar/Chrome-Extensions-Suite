# Pobieracz (Chrome Extension - Manifest V3)

`Pobieracz` to modułowa, stabilna i wydajna wtyczka do przeglądarki Google Chrome oparta na architekturze **Manifest V3**. Narzędzie służy do szybkiego skanowania aktywnej karty, precyzyjnego filtrowania grafik według rzeczywistych wymiarów w pikselach, wstrzykiwania rozszerzonych metadanych (XMP/tEXt/iTXt) oraz pobierania plików w tle przez Service Worker.

---

## 🚀 Główne Funkcje

- **Skanowanie i detekcja pikseli:** Automatyczne wykrywanie grafik z elementów `<img>`, `<picture>` i `<source>` z asynchronicznym sondowaniem rzeczywistych wymiarów (rozwiązanie problemu obrazów o wymiarach `0x0`).
- **Filtrowanie zaawansowane (Dual Sliders):** Dwukierunkowe suwaki zakresowe dla szerokości i wysokości filtrujące widok w czasie rzeczywistym.
- **Wstrzykiwanie metadanych:** Binarne wstrzykiwanie bloków Adobe XMP oraz MicrosoftPhoto (chunki PNG `iTXt`/`tEXt`) – tytuł, autorzy, ocena w gwiazdkach, tagi, komentarze i prawa autorskie.
- **Pobieranie w tle (Background Service Worker):** Pobieranie wsadowe niewrażliwe na zamknięcie okienka popup ani zmianę karty.
- **Organizacja zapisu:** Automatyczna sanityzacja nazw plików pod kątem systemów Windows/Unix oraz obsługa podkatalogów.

---

## 🏗️ Architektura MVC i Zmiany w Refaktoryzacji

W ramach refaktoryzacji wyeliminowano monolityczne klasy typu "God Object" (`popup.js`, `background.js`) i wdrożono czysty wzorzec **MVC** z izolacją serwisów infrastruktury i modułami **ES6**:

```text
PluginDownloader/
│
├── manifest.json                  # Konfiguracja rozszerzenia (Manifest V3, type: module)
├── popup.html                     # Główny widok interfejsu wtyczki (<script type="module">)
│
├── css/
│   └── popup.css                  # Style interfejsu (Grid, flexbox, stany .hidden)
│
├── img/
│   └── icon.png                   # Zasoby graficzne i ikony
│
└── js/
    ├── popup.js                   # Bootstrap aplikacji – inicjalizacja kontenera DI
    ├── content.js                 # Skrypt wstrzykiwany (ekstrakcja grafik z DOM karty)
    ├── background.js              # Service Worker nasłuchujący zadań pobierania IPC
    │
    ├── models/
    │   └── ImageModel.js          # Headless model danych: kolekcja, selekcje, filtry pikseli
    │
    ├── views/
    │   ├── GalleryView.js         # Obsługa siatki miniatur, liczników i delegacji zdarzeń
    │   └── components/
    │       ├── DualSlider.js      # Komponent podwójnego suwaka min/max
    │       ├── DownloadOptionsView.js # Opcje zapisu, formatu oraz przycisk akcji
    │       ├── MetadataModalView.js   # Formularz okna modalnego metadanych
    │       └── ProgressView.js    # Wskaźnik paska postępu i etykieta statusu
    │
    ├── controllers/
    │   └── PopupController.js     # Orkiestrator zdarzeń, spaja modele, widoki i serwisy
    │
    └── services/
        ├── StorageService.js      # Asynchroniczny dostęp do chrome.storage.local
        ├── ScannerService.js      # Zarządzanie chrome.scripting i badanie wymiarów
        ├── DownloadService.js     # Klient IPC wysyłający zadania do Service Workera
        ├── DownloadManagerService.js # Menadżer pobierania wsadowego (fetch, base64, downloads)
        ├── FileNamingService.js   # Sanityzacja znaków i generowanie bezpiecznych ścieżek
        ├── PngMetadataService.js  # Wstrzykiwacz bloków tEXt i kalkulator CRC32
        └── XmpInjectorService.js  # Generator pakietów XMP RDF/XML i chunków iTXt
```

### 📋 Kluczowe usprawnienia jakości kodu:
1. **Zasada pojedynczej odpowiedzialności (SRP):** Modele nie posiadają referencji do drzewa DOM, widoki nie odpytują API przeglądarki, a serwisy infrastruktury są w pełni odizolowane.
2. **Optymalizacja DOM:** Wprowadzono delegację zdarzeń kliknięć w `GalleryView` oraz użycie `DocumentFragment`, co zapobiega wyciekom pamięci i spadkom wydajności przy setkach elementów.
3. **Prawdziwe filtrowanie pikseli:** Skaner kart dociąga brakujące naturalne wymiary obrazów asynchronicznie, dzięki czemu suwaki precyzyjnie operują na realnych rozmiarach plików.
4. **Bezpieczna komunikacja IPC:** Zlecenia pobierania oparte są o obietnice (`Promise`) z poprawną obsługą `chrome.runtime.lastError`.

---

## 🛠️ Instalacja i Uruchomienie w Chrome

1. Pobierz lub sklonuj repozytorium projektu na dysk lokalny.
2. Otwórz przeglądarkę Google Chrome i przejdź pod adres:
   ```text
   chrome://extensions/
   ```
3. W prawym górnym rogu włącz **Tryb dewelopera** (Developer mode).
4. Kliknij przycisk **Wczytaj rozpakowane** (Load unpacked) w lewym górnym rogu.
5. Wskaż katalog główny projektu `PluginDownloader`.
6. Wtyczka pojawi się na pasku narzędzi.

---

## 💻 Technologie

- **JavaScript (ES6 Modules)**
- **Chrome Extensions Manifest V3** (`activeTab`, `scripting`, `downloads`, `storage`)
- **Architektura:** Model-View-Controller (MVC) + Service Layer
- **Standardy binarne:** PNG Spec (chunki `tEXt`, `iTXt`), Adobe XMP / MicrosoftPhoto RDF/XML, CRC32