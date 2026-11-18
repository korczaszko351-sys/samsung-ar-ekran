# Samsung AR Ekran

Obraz kładziony perspektywicznie na dowolnej płaskiej powierzchni — stole, podłodze, ścianie —
i utrzymywany na niej czujnikiem obrotu telefonu.
**Bez ARCore, bez Play Services for AR, bez internetu, bez konta.**

Aplikacja powstała dla telefonów Samsung Galaxy, na których Środowisko Google AR (ARCore) jest
niedostępne, zablokowane albo po prostu niepotrzebne.

| | |
|---|---|
| Stack | Expo SDK 57, React Native 0.86, Expo Router, TypeScript (strict) |
| Platforma | Android (APK), podgląd w przeglądarce |
| Build APK | GitHub Actions — `expo prebuild` + Gradle, bez konta Expo i bez EAS |
| Dane | wyłącznie na telefonie (AsyncStorage + pliki w pamięci aplikacji) |
| Wersja | 2.0.0 — rzutowanie na powierzchnię (homografia) |

---

## Jak to działa

ARCore sam znajduje płaszczyzny i mierzy głębię. Tutaj tego nie ma — i to jest celowe:

1. **Tło** to obraz z aparatu (`expo-camera`), pełnoekranowy.
2. **Powierzchnię** wskazujesz czterema narożnikami: przeciągasz uchwyty 1–4 na rogi stołu,
   podłogi albo ściany.
3. **Obraz** jest wpisywany w ten czworokąt **homografią** — macierzą rzutową 3×3, która
   uwzględnia perspektywę. Dzięki temu obraz *leży* na powierzchni, a nie jest prostokątem
   przyklejonym do ekranu.
4. **Śledzenie** — czujnik obrotu (rotation vector) daje obrót telefonu względem chwili
   zaznaczenia, a `H = K · R · K⁻¹` przesuwa czworokąt dokładnie tak, jak przesuwa się
   powierzchnia w kadrze. Obraz zostaje na stole, gdy obracasz telefon.

Pełny opis matematyki, kalibracji i ograniczeń: **[docs/SURFACE_TRACKING.md](docs/SURFACE_TRACKING.md)**.

## Funkcje

- Plansze: **tekst**, **jednolity kolor tła**, **zdjęcie z galerii** (kopiowane do pamięci
  aplikacji, więc nie znikają po wyczyszczeniu cache).
- Projekcja: zaznaczanie powierzchni czterema narożnikami, obraz widoczny już podczas
  zaznaczania, przeciąganie obrazu po powierzchni, suwaki rozmiaru i krycia, siatka
  pomocnicza, odbicie lustrzane, opcjonalny odczyt techniczny.
- Kalibracja: pole widzenia aparatu 40–75°, wygładzanie czujnika, odwrócenie kierunku
  śledzenia.
- Fallback: brak zgody na aparat → ciemne tło i działający obraz; brak czujnika obrotu →
  obraz statyczny z komunikatem w odczycie; przeglądarka → komunikat zamiast podglądu kamery.
- Zero ruchu sieciowego: brak backendu, brak analityki, brak konta.

## Szybki start (na komputerze)

```bash
npm ci                 # instaluje zależności i generuje ikonę (postinstall)
npm start              # Expo dev server — zeskanuj QR w Expo Go
npx tsc --noEmit       # kontrola typów
```

## Zbudowanie APK

Pełna instrukcja krok po kroku, w tym podpisywanie własnym kluczem: **[docs/BUILD_APK.md](docs/BUILD_APK.md)**.

W skrócie — najprostsza droga, bez żadnego konta Expo:

1. Wypchnij kod na GitHub (albo użyj tego repozytorium).
2. Zakładka **Actions** → **Build Android APK** → **Run workflow**.
3. Po ~10–15 minutach pobierz artefakt `samsung-ar-ekran-apk-…` (zawiera APK debug i release).
4. Przenieś APK na telefon, zainstaluj (trzeba zezwolić na instalację z nieznanych źródeł).

Alternatywnie, jeśli wolisz EAS lub build lokalny — patrz dokument instrukcji.

## Struktura projektu

```
src/
  app/                     ekrany (Expo Router)
    (tabs)/index.tsx       Start — opis i przycisk projekcji
    (tabs)/screens.tsx     lista plansz, wybór aktywnej
    (tabs)/settings.tsx    kalibracja śledzenia i informacje o urządzeniu
    projector.tsx          projekcja: kamera + czworokąt + homografia
    screen-editor.tsx      edytor planszy (tekst / kolor / obraz)
  components/
    projection/            surface-picker, projected-screen, siatka, HUD
    ui/                    Button, Card, TextField, ConfirmDialog, EmptyState
  hooks/
    use-device-pose.ts     czujnik obrotu (rotation vector), wygładzanie kątów
    use-screens.ts         lista plansz + aktywna plansza
    use-persistent-state.ts  stan trwały z obsługą wyścigu odczytu i zapisu
  lib/
    homography.ts          DLT, macierz 4×4, intrinsics, obroty — cała matematyka
    projection.ts          pomocnicze: clamp, wygładzanie, rozmiar planszy
    storage.ts             AsyncStorage z wersjonowaniem schematu
    media.ts               import obrazu do trwałego katalogu
plugins/
  with-camera-compatible-preview.js   TextureView zamiast SurfaceView
scripts/make-icon.mjs      generuje assets/images/icon.png (bez zależności)
.github/workflows/         build APK (debug + release, artefakty, wydania)
```

## Ograniczenia

- **Brak automatycznego wykrywania płaszczyzn i głębi.** Powierzchnię wskazujesz sam; rozmiar
  obrazu wynika z zaznaczonego czworokąta, nie z pomiaru w metrach.
- **Dryf przy przesuwaniu telefonu.** Czujnik obrotu mierzy obrót, nie translację — obraz jest
  dokładny przy obrocie w miejscu, a przy chodzeniu po klasie będzie się przesuwał. Zaznacz
  powierzchnię ponownie po zmianie miejsca.
- **Jakość czujnika zależy od modelu.** Tanie Galaxy mają gorszy żyroskop i brak magnetometru;
  na nich śledzenie będzie wyraźnie mniej pewne.
- **Brak okluzji.** Obraz rysowany jest zawsze nad obrazem z kamery, więc nie chowa się za
  przedmiotami.
- **Nagrzewanie i throttling.** Ciągły podgląd kamery plus czujnik 20 Hz rozgrzewa telefon;
  przy długiej pracy (np. lekcja) liczba klatek może spaść.
- **Ikona jest generowana**, nie commitowana — `npm ci` (postinstall) tworzy
  `assets/images/icon.png`. Katalog jest w `.gitignore`.

## Uprawnienia

| Uprawnienie | Po co | Co się dzieje bez niego |
|---|---|---|
| `CAMERA` | obraz z kamery jako tło | ciemne tło, obraz nadal widoczny |
| czujniki ruchu (bez uprawnienia systemowego) | śledzenie powierzchni | obraz statyczny, odczyt pokazuje „brak czujnika obrotu" |
| galeria (przez picker) | zdjęcie jako treść planszy | można nadal używać tekstu i koloru |

## Licencja

Projekt edukacyjny. Korzystaj i modyfikuj dowolnie; kod dostarczany bez gwarancji.
