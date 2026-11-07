# Pobieracz (Chrome Extension - Manifest V3)

`Pobieracz` to lekka, stabilna i wydajna wtyczka do przeglądarki Google Chrome oparta na architekturze **Manifest V3**. Narzędzie służy do szybkiego skanowania, filtrowania według wymiarów oraz pobierania grafik z aktywnej karty w tle.

---

## 🚀 Główne Funkcje

- **Skanowanie aktywnej karty:** Automatyczne wykrywanie wszystkich obrazów oraz elementów `<picture>` i `<source>` na bieżąco otwartej stronie.
- **Filtrowanie zaawansowane:** Dwukierunkowe suwaki (Dual Sliders) pozwalające na precyzję filtrowania grafik pod kątem minimalnej i maksymalnej szerokości oraz wysokości.
- **Podgląd galerii:** Wizualna siatka miniatur z podglądem wymiarów każdego obrazu i możliwością selekcji (zaznacz/odznacz wszystkie lub pojedyncze elementy).
- **Pobieranie w tle (Background Service Worker):** Proces pobierania plików nie przerywa się przy zmianie karty ani zamknięciu wyskakującego okienka popup.
- **Organizacja i konwersja:** Opcja zapisu do wskazanego podkatalogu oraz konwersja formatów (PNG, JPEG).

---

## 📂 Struktura Projektu

```text
WtyczkaPobieracz/
│
├── manifest.json         # Główny plik konfiguracyjny rozszerzenia (Manifest V3)
├── popup.html            # Interfejs użytkownika wtyczki (HTML)
├── css/
│   └── popup.css         # Style interfejsu (opcjonalnie / dołączone w HTML)
├── js/
│   ├── popup.js          # Logika interfejsu, zarządzanie filtrami i stanem
│   ├── content.js        # Skrypt wstrzykiwany do aktywnej karty (ekstrakcja grafik)
│   └── background.js     # Skrypt tła obsługujący pobieranie plików przez API Chrome
└── img/
    └── icon.png          # Ikona rozszerzenia
```

---

## 🛠️ Instalacja i Uruchomienie w Chrome

1. Pobierz lub sklonuj repozytorium projektu na swój dysk lokalny.
2. Otwórz przeglądarkę Google Chrome i przejdź pod adres:
   ```text
   chrome://extensions/
   ```
3. W prawym górnym rogu włącz **Tryb dewelopera** (Developer mode).
4. Kliknij przycisk **Właduj rozpakowane** (Load unpacked) w lewym górnym rogu.
5. Wskaż katalog główny projektu `WtyczkaPobieracz`.
6. Wtyczka pojawi się na liście rozszerzeń – możesz przypiąć ją do paska narzędzi przeglądarki.

---

## 💻 Technologie

- **JavaScript (ES6+)**
- **Chrome Extensions API** (`activeTab`, `scripting`, `downloads`, `storage`)
- **HTML5 & CSS3** (Flexbox, Grid)