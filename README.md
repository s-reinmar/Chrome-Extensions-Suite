# Chrome Extensions Suite (Manifest V3)

Kolekcja modularnych, wydajnych rozszerzeń do przeglądarki Google Chrome zbudowanych w oparciu o architekturę **Manifest V3**, czysty wzorzec **MVC** oraz natywne moduły **ES6**. 

Każdy projekt stanowi niezależną wtyczkę z własnym manifestem i izolowanym kontekstem wykonawczym, zachowując spójne standardy inżynierii oprogramowania (zasady SOLID, separacja warstw, brak zbędnych bibliotek zewnętrznych).

---

## 📦 Dostępne Rozszerzenia

| Katalog / Wtyczka | Status | Główne technologie | Opis |
| :--- | :---: | :--- | :--- |
| **`PluginDownloader/`** | Gotowy | JS (ES6), MVC, XMP, Canvas, Manifest V3 | Zaawansowany ekstraktor mediów (SPA/Flaticon), filtrowanie pikselowe w czasie rzeczywistym, wstrzykiwanie metadanych XMP/PNG oraz wsadowe pobieranie w tle. |
| *`[Kolejna wtyczka]`* | W planach | Manifest V3, Web APIs | *Miejsce na kolejne narzędzie...* |

---

## 🏗️ Architektura Monorepo

Repozytorium organizuje rozszerzenia w odizolowanych podkatalogach. Pozwala to na niezależny rozwój, wersjonowanie i instalację poszczególnych wtyczek bez konfliktów zależności:

```text
chrome-extensions-hub/
│
├── .github/                      # Workflowy CI/CD (linting, testy, budowanie paczek ZIP)
│
├── PluginDownloader/             # Wtyczka: Pobieracz obrazów i metadanych
│   ├── manifest.json
│   ├── popup.html
│   ├── css/
│   ├── img/
│   ├── js/
│   └── README.md                 # Szczegółowa dokumentacja modułu
│
├── [PluginName]/                 # Kolejne rozszerzenie w monorepo
│   ├── manifest.json
│   ├── popup.html
│   └── ...
│
└── README.md                     # Główny przewodnik po repozytorium
```

---

## 📐 Standardy Architektoniczne Projektów

Wszystkie wtyczki w tym repozytorium powstają w oparciu o wspólne pryncypia architektoniczne:

1. **Manifest V3 & ES Modules:**
   - Wykorzystanie natywnych modułów (`type="module"` w `popup.html` oraz deklaracji `background.service_worker` w `manifest.json`).
   - Zero ciężkich bundlerów tam, gdzie wystarcza natywny moduł ES6 silnika V8.
2. **Wzorzec Model-View-Controller (MVC):**
   - **Models (`models/`):** Bezstanowe lub „headless” obiekty danych, bez dostępu do DOM i API przeglądarki. W 100% testowalne jednostkowo w izolacji.
   - **Views (`views/`):** Warstwa prezentacji operująca na fragmentach dokumentu (`DocumentFragment`), delegacji zdarzeń i mutacjach klas CSS (`.hidden`, `.selected`).
   - **Controllers (`controllers/`):** Orkiestracja przepływu danych i reakcja na zdarzenia (Dependency Injection).
   - **Services (`services/`):** Izolowane fasady na API przeglądarki (`chrome.storage`, `chrome.scripting`, `chrome.downloads`, IPC) oraz operacje niskopoziomowe (np. binarne parsowanie nagłówków, CRC32, pakietowanie XMP).
3. **Optymalizacja I/O i Pamięci:**
   - Obowiązkowy mechanizm debounce (np. 300 ms) przy operacjach zapisu konfiguracji do `chrome.storage.local`.
   - Asynchroniczne pule zapytań (Worker / Concurrency Pool) zamiast nieskończonych równoległych żądań `fetch()`.

---

## 🛠️ Instalacja i Uruchomienie w Chrome

Każde rozszerzenie ładuje się bezpośrednio z poziomu przeglądarki bez konieczności kompilacji:

1. Sklonuj całe repozytorium na dysk lokalny:
   ```bash
   git clone https://github.com/twoj-login/twoje-repo-plugins.git
   ```
2. Otwórz przeglądarkę Google Chrome i przejdź pod adres:
   ```text
   chrome://extensions/
   ```
3. W prawym górnym rogu aktywuj przełącznik **Tryb dewelopera** (Developer mode).
4. Kliknij przycisk **Załaduj rozpakowane** (Load unpacked) w lewym górnym rogu.
5. Wskaż podkatalog konkretnej wtyczki (np. `chrome-extensions-hub/PluginDownloader/`).
6. Wtyczka pojawi się na liście i będzie gotowa do przypięcia na pasku narzędzi.

---

## 💻 Technologie Wspólne

- **Środowisko:** Chrome Extensions API (Manifest V3)
- **Język:** Pure JavaScript (ES6+ Modules, Async/Await, Web Streams)
- **Styling:** CSS3 (CSS Grid, Flexbox, CSS Custom Properties / Variables)
- **Standardy binarne i I/O:** `ArrayBuffer`, `DataView`, `Blob`, `Canvas API`, specyfikacja bloków PNG (`tEXt`, `iTXt`), RDF/XML (Adobe XMP, MicrosoftPhoto)

---

## 🤝 Dodawanie Nowej Wtyczki do Zestawu

1. Utwórz dedykowany folder projektu w katalogu głównym repozytorium.
2. Skonfiguruj autonomiczny plik `manifest.json` z zachowaniem Manifest V3.
3. Zastosuj ustandaryzowaną strukturę podkatalogów: `js/models`, `js/views`, `js/controllers`, `js/services`.
4. Dołącz lokalny plik `README.md` w podkatalogu wtyczki z opisem uprawnień i architektury modułu.
5. Zarejestruj nową pozycję w tabeli sekcji **Dostępne Rozszerzenia** niniejszego pliku.