# Samsung AR Ekran

Wirtualny ekran rysowany na obrazie z tylnego aparatu telefonu i stabilizowany akceleratorem.
**Bez ARCore, bez Play Services for AR, bez internetu, bez konta.**

Aplikacja powstała dla telefonów Samsung Galaxy, na których Środowisko Google AR (ARCore) jest
niedostępne, zablokowane albo po prostu niepotrzebne.

| | |
|---|---|
| Stack | Expo SDK 57, React Native 0.86, Expo Router, TypeScript (strict) |
| Platforma | Android (APK), podgląd w przeglądarce |
| Build APK | GitHub Actions — `expo prebuild` + Gradle, bez konta Expo i bez EAS |
| Dane | wyłącznie na telefonie (AsyncStorage + pliki w pamięci aplikacji) |

---

## Jak to działa

ARCore rozpoznaje płaszczyzny i mierzy głębię. Tutaj tego nie ma — i to jest celowe:

1. **Tło** to obraz z aparatu (`expo-camera`), pełnoekranowy.
2. **Plansza** to przezroczysty prostokąt 16:9 rysowany nad obrazem, z treścią użytkownika.
3. **Rozmiar** wynika z geometrii rzutowania: `wysokość planszy / (2 · d · tan(FOV/2))`, gdzie
   `d` to podana odległość, a `FOV` to pole widzenia aparatu z ustawień.
4. **Stabilizacja** — po przechyleniu telefonu akcelerometr zwraca zmianę kąta, a plansza
   przesuwa się w przeciwną stronę o `kąt × (wysokość kadru / FOV)`. Efekt: plansza „wisi”
   w jednym miejscu, jak naklejka na ścianie widziana przez ruchome okno.
5. **Magnetometr** (jeśli jest) daje przybliżony azymut — pokazywany w HUD jako wartość
   informacyjna, bez kalibracji względem kamery.

Czego świadomie **nie** ma: wykrywania płaszczyzn, pomiaru głębi, okluzji, śledzenia 6DoF.
To konsekwencja braku ARCore, a nie przeoczenie — patrz [Ograniczenia](#ograniczenia).

## Funkcje

- Plansze: **tekst**, **jednolity kolor tła**, **zdjęcie z galerii** (kopiowane do pamięci
  aplikacji, więc nie znikają po wyczyszczeniu cache).
- Projekcja: przeciąganie planszy palcem, suwaki rozmiaru / odległości / krycia, siatka
  pomocnicza, odbicie lustrzane, HUD z odczytem FOV, przechyłu i azymutu.
- Kalibracja: pole widzenia aparatu 40–75°, wygładzanie czujników, odwrócenie kierunku przechyłu.
- Fallback: brak zgody na aparat → ciemne tło i działająca plansza; brak magnetometru →
  „brak magnetometru” w HUD; przeglądarka → komunikat zamiast podglądu kamery.
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
    (tabs)/settings.tsx    kalibracja i informacje o urządzeniu
    projector.tsx          projekcja: kamera + plansza + czujniki
    screen-editor.tsx      edytor planszy (tekst / kolor / obraz)
  components/
    projection/            plansza, siatka, HUD
    ui/                    Button, Card, TextField, ConfirmDialog, EmptyState
  hooks/
    use-tilt.ts            akcelerometr + magnetometr, wygładzanie
    use-screens.ts         lista plansz + aktywna plansza
    use-persistent-state.ts  stan trwały z obsługą wyścigu odczytu i zapisu
  lib/
    projection.ts          geometria rzutowania, przechył, azymut
    storage.ts             AsyncStorage z wersjonowaniem schematu
    media.ts               import obrazu do trwałego katalogu
scripts/make-icon.mjs      generuje assets/images/icon.png (bez zależności)
.github/workflows/         build APK (debug + release, artefakty, wydania)
```

## Ograniczenia

- **Brak wykrywania płaszczyzn i głębi.** Powierzchnię wybierasz sam, a rozmiar planszy wynika
  z podanej odległości i FOV. Przy złej kalibracji plansza będzie większa lub mniejsza niż
  w rzeczywistości.
- **Dryf przy obrocie telefonu.** Akcelerometr mierzy przechył, nie obrót wokół osi pionowej.
  Obrót telefonu w poziomie nie przesuwa planszy tak, jak przesunąłby ją prawdziwy świat —
  dlatego magnetometr jest tylko odczytem informacyjnym.
- **Jakość czujników zależy od modelu.** Tanie Galaxy mają gorszy akcelerometr i brak
  magnetometru; na nich stabilizacja będzie wyraźnie mniej pewna.
- **Brak okluzji.** Plansza rysowana jest zawsze nad obrazem z kamery, więc nie chowa się za
  przedmiotami.
- **Nagrzewanie i throttling.** Ciągły podgląd kamery plus odświeżanie czujników co 80 ms
  rozgrzewa telefon; przy długiej pracy (np. lekcja) liczba klatek może spaść.
- **Ikona jest generowana**, nie commitowana — `npm ci` (postinstall) tworzy
  `assets/images/icon.png`. Katalog jest w `.gitignore`.

## Uprawnienia

| Uprawnienie | Po co | Co się dzieje bez niego |
|---|---|---|
| `CAMERA` | obraz z kamery jako tło | ciemne tło, plansza nadal widoczna |
| czujniki ruchu (bez uprawnienia systemowego) | stabilizacja i azymut | plansza nieruchoma, HUD pokazuje „brak czujników” |
| galeria (przez picker) | zdjęcie jako treść planszy | można nadal używać tekstu i koloru |

## Licencja

Projekt edukacyjny. Korzystaj i modyfikuj dowolnie; kod dostarczany bez gwarancji.
