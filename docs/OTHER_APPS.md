# Treść z innych aplikacji

Projekcja pokazuje to, co przygotujesz w aplikacji — planszę z tekstem, kolorem albo zdjęciem.
Ta strona opisuje, jak wprowadzić do niej treść **zrobioną w innej aplikacji** i czego zrobić
się nie da bez kodu natywnego.

---

## 1. Co jest możliwe (i jest w aplikacji)

Zakładka **Plansze → Z innej aplikacji**:

### 1.1 Obraz z dowolnej aplikacji

Przycisk **Obraz z aplikacji** otwiera systemowy wybór plików (`expo-document-picker`). To ten
sam wybór, który widzisz w każdej aplikacji Androida, więc dojdziesz przez niego do:

- **Galerii** i **Zdjęć** (Samsung Gallery, Google Photos),
- **Moich plików** / **Pliki** (pobrane, dokumenty, karty SD),
- **Dysku Google**, **OneDrive**, **Dropboxa**,
- **załączników z Gmaila** i innych klientów poczty,
- **eksportu z dowolnego edytora** — Canva, PowerPoint, Notatnik, arkusz kalkulacyjny,
  przeglądarka („Zapisz jako obraz"), zrzut ekranu zrobiony w innej aplikacji.

Wybrany plik jest **kopiowany do pamięci aplikacji** (`importImage()` w `src/lib/media.ts`),
a nie tylko linkowany. To ważne: system może wyczyścić katalog tymczasowy, a wtedy plansza
zrobiłaby się pusta. Kopia zostaje, dopóki sam jej nie usuniesz.

### 1.2 Tekst ze schowka

Przycisk **Tekst ze schowka** czyta schowek systemowy (`expo-clipboard`). Przepływ:

1. W innej aplikacji zaznacz tekst i **Kopiuj** (notatka, strona w przeglądarce, e-mail,
   dokument, czat).
2. Wróć do Samsung AR Ekran → **Plansze** → **Tekst ze schowka**.
3. Powstaje plansza z pierwszej linii jako tytułem i do 600 znakami treści.

Dłuższy tekst jest przycinany z wielokropkiem — plansza na stole czyta się z odległości,
więc 600 znaków to i tak dużo.

### 1.3 Co się dzieje, gdy coś nie wyjdzie

Oba importy zwracają typowany wynik (`ImportResult`): `ok`, `cancelled` albo `error`.
Anulowanie wyboru pliku jest ciche (tak ma być), ale **błąd pokazuje alert z powodem** —
pusty schowek, brak dostępu do pliku, nieobsługiwany format. Nie ma sytuacji, w której
przycisk „nic nie robi".

---

## 2. Czego nie da się zrobić w tej wersji

### 2.1 Lustrzane odbicie ekranu innej aplikacji na żywo

To znaczy: uruchamiasz YouTube albo PowerPoint na telefonie i chcesz, żeby ich **żywy obraz**
leżał na stole. Teoretycznie Android na to pozwala — przez `MediaProjection` (to samo API,
którego używa „Cast" i nagrywanie ekranu). Praktycznie **wymaga kodu natywnego**:

| Potrzebne | Dlaczego nie da się z Expo/JS |
|---|---|
| `MediaProjectionManager.createScreenCaptureIntent()` | API Androida, brak odpowiednika w Expo |
| `VirtualDisplay` + `ImageReader` | natywne, trzeba napisać moduł Kotlin |
| Zgoda użytkownika przy każdym uruchomieniu | systemowa intencja, nie da się wywołać z JS |
| Renderowanie klatek jako tekstura | wymaga `SurfaceTexture` wpiętego w drzewo widoków |

Do tego dochodzi ograniczenie, które psuje cały efekt: **`MediaProjection` przechwytuje
ekran, a nie to, co widzi kamera**. Obraz z innej aplikacji byłby płaski, w orientacji ekranu,
i nie miałby nic wspólnego z perspektywą powierzchni — nie dałoby się go „położyć" na stole
tak, jak kładzie się planszę. Zrzut ekranu wklejony jako obraz (punkt 1.1) daje ten sam
efekt wizualny i działa bez uprawnień.

**Wniosek:** jeśli potrzebujesz żywego lustra innej aplikacji, to jest osobny projekt —
własny moduł natywny w Kotlinie plus `expo-modules-core`. Powiedz, a rozpiszę plan.

### 2.2 Odczyt ekranu innej aplikacji bez zgody

Nie da się i nie próbujemy. Android od Androida 5 blokuje to celowo.

### 2.3 Automatyczne odświeżanie treści z innej aplikacji

Plansza to **kopia w chwili importu**. Jeśli w Canvie zmienisz slajd, musisz zaimportować go
ponownie. To świadome: projekcja nie może zależeć od tego, czy inna aplikacja jest otwarta.

---

## 3. Praktyczne scenariusze na lekcję

| Chcesz pokazać | Jak to zrobić |
|---|---|
| Slajd z PowerPointa / Canvy | Eksportuj slajd jako PNG → **Obraz z aplikacji** |
| Zadanie z podręcznika (PDF) | Zrób zrzut ekranu strony → **Obraz z aplikacji** |
| Fragment notatki | Skopiuj tekst → **Tekst ze schowka** |
| Wzór lub definicja | Wpisz w edytorze plansz albo skopiuj skądś → **Tekst ze schowka** |
| Zdjęcie z wycieczki | **Obraz z aplikacji** → Galeria |
| Wykres z arkusza | Zrzut ekranu wykresu → **Obraz z aplikacji** |

Wskazówka: obraz 16:9 wypełnia planszę bez pasów. Zrzuty ekranu telefonu są zwykle 9:19,5 —
będą miały pasy po bokach, bo plansza używa `contentFit="contain"`.

---

## 4. Gdzie to jest w kodzie

```
src/lib/import-content.ts        importImageFromApp(), importTextFromClipboard(), ImportResult
src/app/(tabs)/screens.tsx       karta „Z innej aplikacji" z dwoma przyciskami
src/lib/media.ts                 importImage() — trwała kopia pliku
package.json                     expo-document-picker ~57.0.3, expo-clipboard ~57.0.2
```

Uprawnienia: **żadne nowe**. Wybór plików idzie przez systemowy picker (uprawnienie
`READ_MEDIA_IMAGES` nie jest potrzebne, bo użytkownik sam wskazuje plik), a schowek na
Androidzie 10+ działa bez uprawnienia, dopóki aplikacja jest na wierzchu.
