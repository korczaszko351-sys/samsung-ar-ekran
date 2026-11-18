# Śledzenie powierzchni — jak to działa i jak je skalibrować

Wersja 2.0 zamienia „stabilizację żyroskopem" na **rzutowanie obrazu na zaznaczoną płaską
powierzchnię**. Obraz nie jest już prostokątem, który przesuwa się po ekranie — jest wpisany
w czworokąt powierzchni transformacją rzutową i zostaje na niej, gdy obracasz telefon.

Nadal **bez ARCore**, bez Play Services for AR i bez internetu.

---

## 1. Dlaczego homografia, a nie obrót prostokąta

Płaska powierzchnia widziana przez kamerę to nie prostokąt. Gdy patrzysz na stół pod kątem,
jego boki zbiegają się w perspektywie. Jedynym poprawnym opisem takiego odwzorowania jest
**homografia** — macierz 3×3, która przekształca płaszczyznę obrazu w płaszczyznę powierzchni:

```
        ⎡ h00 h01 h02 ⎤
H  =    ⎢ h10 h11 h12 ⎥        p' = H · p / (h20·x + h21·y + h22)
        ⎣ h20 h21 h22 ⎦
```

Ostatni wiersz (`h20`, `h21`) odpowiada za perspektywę — to on sprawia, że dalsza krawędź
stołu jest krótsza niż bliższa. Wersja 1.0 tego nie miała: rysowała prostokąt i tylko go
przesuwała, więc obraz nigdy nie „kładł się" na powierzchni.

### Skąd bierze się H

1. **Cztery narożniki.** Użytkownik przeciąga cztery uchwyty na rogi powierzchni. Z czterech
   par punktów (narożnik obrazu → narożnik powierzchni) wyznaczamy H metodą DLT: rozwiązujemy
   układ 8 równań liniowych z `h22 = 1`. Kod: `solveHomography()` w `src/lib/homography.ts`.
2. **Wpisanie w widok.** React Native przekształca widok względem jego **środka**, więc H musi
   być sprzężone przesunięciem: `M = T(−C) · H · T(C)`. Bez tego korekta dotyczy tylko
   przesunięcia, a część liniowa zostaje błędna — obraz wtedy zjeżdża i ścina się zamiast
   trafić w czworokąt. Kod: `matrix4FromQuad()`.
3. **Utrzymanie na powierzchni.** Gdy telefon się obraca, powierzchnia przesuwa się w kadrze.
   Dla czystego obrotu obowiązuje dokładny wzór:

   ```
   H_rot = K · R · K⁻¹
   ```

   gdzie `K` to macierz intrinsics kamery (ogniskowa + środek), a `R` to obrót telefonu
   względem chwili zaznaczenia. To ta sama zależność, której używa AR do „przyklejenia"
   wirtualnego obiektu do płaszczyzny — tylko liczona z czujnika obrotu, nie z chmury punktów.

### Osie i konwencje

| Element | Konwencja |
|---|---|
| Układ urządzenia | X w prawo, Y w górę ekranu, Z z ekranu |
| Układ kamery | X w prawo, Y w dół, Z w głąb sceny — zmiana bazy `diag(1, −1, −1)` |
| Kąty z `expo-sensors` | `alpha` = obrót wokół Z, `beta` = wokół X (kiwanie), `gamma` = wokół Y (obrót w poziomie) |
| Macierz obrotu | `Rz(alpha) · Rx(beta) · Ry(gamma)` |

Kolejność ma znaczenie: przy złej kolejności kiwanie telefonem przesuwało obraz w poziomie
zamiast w pionie. To był realny błąd wykryty testem numerycznym (patrz §5).

---

## 2. Co widzi użytkownik

1. **Uruchom projekcję** → obraz od razu jest widoczny, wpisany w domyślny czworokąt na
   środku kadru. Nie ma etapu „najpierw zaznacz, potem zobacz".
2. **Przeciągnij uchwyty 1–4** na rogi stołu / podłogi / ściany. Obraz podąża za narożnikami
   na żywo, więc od razu widać, czy leży dobrze.
3. **Zatwierdź powierzchnię** (przycisk lub ✓ u góry). Od tej chwili czujnik obrotu utrzymuje
   obraz na powierzchni.
4. **Przeciągnij palcem po ekranie**, aby przesunąć cały obraz po powierzchni.
5. **Zaznacz ponownie** — gdy chcesz przenieść projekcję na inny stół.

---

## 3. Kalibracja na telefonie

Kolejność ma znaczenie — idź od góry.

### 3.1 Pole widzenia aparatu (najważniejsze)

**Ustawienia → Pole widzenia aparatu**, 40–75°.

To jedyny parametr, który wpływa na to, **jak mocno obraz ucieka** przy obrocie. Z niego
liczona jest ogniskowa `f = h / (2·tan(FOV/2))`, a więc skala ruchu.

| Objaw | Co zrobić |
|---|---|
| Obraz ucieka za mocno — przy lekkim obrocie wylatuje z kadru | **zmniejsz** FOV o 3–5° |
| Obraz prawie nie reaguje na obrót, „przyklejony" do ekranu | **zwiększ** FOV o 3–5° |

Wartości startowe: większość Galaxy z aparatem głównym ma pionowe FOV **45–55°**. Modele
z ultrawide jako domyślnym (np. A-series) mogą potrzebować 60–70°.

> Uwaga: podgląd kamery jest przycinany do proporcji ekranu (`FILL_CENTER`), więc aplikacja
> liczy intrinsics dla **widocznego** kadru, nie dla surowego sensora 4:3. To celowe — inaczej
> ogniskowa byłaby za krótka i obraz przesuwałby się o 20–30% za daleko.

### 3.2 Wygładzanie czujnika

**Ustawienia → Wygładzanie czujnika**, 0–0,9.

- `0` — surowe dane, obraz drga od szumu czujnika.
- `0,2–0,4` — **zalecane** na lekcję: spokojnie, ale bez opóźnienia.
- `0,6+` — bardzo gładko, ale obraz „pływa" za telefonem.

### 3.3 Odwrócenie kierunku śledzenia

**Ustawienia → Odwróć kierunek śledzenia.**

Włącz, jeśli obraz ucieka w **przeciwną** stronę niż telefon (obracasz w prawo — obraz idzie
w lewo). Na większości Galaxy nie jest potrzebne; to bezpiecznik na modele, które raportują
kąty z przeciwnym znakiem.

### 3.4 Dokładność zaznaczenia

To nie jest ustawienie, ale ma największy wpływ na to, czy obraz „przylega":

- Zaznaczaj **rzeczywiste rogi** powierzchni, nie przybliżone.
- Kolejność: lewy górny → prawy górny → prawy dolny → lewy dolny.
- Czworokąt musi być **wypukły** i nie może się przecinać — aplikacja odrzuci taki
  (`isUsableQuad()`), bo homografia dla niego nie istnieje.
- Im większa powierzchnia w kadrze, tym mniejszy wpływ błędu zaznaczenia.

### 3.5 Rozmiar i krycie

- **Rozmiar obrazu** skaluje czworokąt wokół jego środka — 1,00× to dokładnie zaznaczona
  powierzchnia, 0,80× to obraz mniejszy od niej (zostaje margines).
- **Krycie** 60–80% wygląda jak światło rzucone na stół; 100% to pełny, nieprzezroczysty obraz.

---

## 4. Ograniczenia — uczciwie

| Ograniczenie | Dlaczego | Co z tym zrobić |
|---|---|---|
| **Brak wykrywania płaszczyzn** | To wymaga ARCore | Powierzchnię wskazujesz czterema narożnikami |
| **Brak pomiaru głębi** | Wymaga ARCore / ToF | Rozmiar wynika z zaznaczonego czworokąta, nie z metrów |
| **Brak okluzji** | Wymaga mapy głębi | Obraz zawsze rysowany nad kamerą — nie chowa się za przedmiotami |
| **Dryf przy przesuwaniu telefonu** | Czujnik obrotu mierzy obrót, nie translację | Obraz jest dokładny przy **obrocie w miejscu**; przy chodzeniu po klasie będzie się przesuwał. Zaznacz powierzchnię ponownie po zmianie miejsca |
| **Jakość czujnika zależy od modelu** | Tanie Galaxy mają gorszy żyroskop | Zwiększ wygładzanie; na modelach bez żyroskopu śledzenie będzie widocznie gorsze |
| **Nagrzewanie** | Ciągły podgląd kamery + czujnik 20 Hz | Przy długiej lekcji licz się ze spadkiem klatek; zamknij inne aplikacje |

**Czego aplikacja nie robi:** nie wysyła nic do internetu, nie wymaga konta, nie zbiera
analityki. Wszystkie dane (plansze, zaznaczona powierzchnia, ustawienia) zostają w pamięci
telefonu.

---

## 5. Jak to jest sprawdzone

Matematyka jest pokryta testem numerycznym (skrypt `tmp/test-homography.mjs`, uruchamiany na
skompilowanym `homography.ts`):

| Test | Wynik |
|---|---|
| Cztery narożniki obrazu trafiają w cztery narożniki czworokąta (symulacja transformacji RN względem środka) | błąd **0,000000 px** |
| Obrót zerowy → homografia jednostkowa | `1,0,0, 0,1,0, 0,0,1` |
| Kiwnięcie +10° (`beta`) | przesuwa obraz **w pionie** o 132 px |
| Obrót w poziomie +10° (`gamma`) | przesuwa obraz **w poziomie** o 132 px |
| Obrót wokół osi ekranu +10° (`alpha`) | obraca obraz wokół środka, bez przesunięcia |
| Czworokąt zdegenerowany (wszystkie punkty w jednym miejscu) | odrzucony |
| Czworokąt samoprzecinający się | odrzucony |

**Czego test nie obejmuje:** zachowania na prawdziwym telefonie. Nie ma tu ani urządzenia, ani
kamery, więc dokładność śledzenia przy realnym ruchu trzeba ocenić na sprzęcie — stąd §3.

---

## 6. Gdzie to jest w kodzie

```
src/lib/homography.ts              cała matematyka: DLT, macierz 4×4, intrinsics, obroty
src/hooks/use-device-pose.ts       czujnik obrotu (rotation vector) + wygładzanie kątów
src/components/projection/
  surface-picker.tsx               cztery przeciągalne narożniki + krawędzie
  projected-screen.tsx             obraz warp-owany macierzą homografii
  projection-hud.tsx               odczyt: tryb śledzenia, FOV, przechył
src/app/projector.tsx              złożenie: kamera → czworokąt → homografia → obraz
plugins/with-camera-compatible-preview.js
                                   TextureView zamiast SurfaceView (inaczej obraz jest
                                   zasłonięty przez warstwę kamery)
```

### Dlaczego plugin jest konieczny

`PreviewView` z CameraX domyślnie działa w trybie `PERFORMANCE`, czyli renderuje obraz kamery
do osobnej warstwy `SurfaceView`. Na wielu Samsungach ta warstwa jest komponowana **nad**
hierarchią widoków React Native — więc wszystko, co rysujemy na kamerze, jest niewidoczne.
Plugin przełącza podgląd na `ImplementationMode.COMPATIBLE` (TextureView w normalnym drzewie
widoków), dzięki czemu obraz jest widoczny. To była główna przyczyna „nic się nie wyświetla"
w wersji 1.0.

Plugin zapisuje wynik do `android/camera-preview-patch.txt` podczas `expo prebuild`, więc w
logu builda widać, czy patch się przyjął:

```
[with-camera-compatible-preview] patched: preview uses ImplementationMode.COMPATIBLE (TextureView)
```

Jeśli zamiast tego pojawi się `pattern not found`, znaczy że expo-camera zmieniło źródło —
wtedy trzeba zaktualizować `NEEDLE` w pluginie.
