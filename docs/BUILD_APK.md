# Jak zbudować APK aplikacji Samsung AR Ekran

Trzy drogi. **A** nie wymaga żadnego konta i jest najszybsza w utrzymaniu, **B** to klasyczne
EAS z darmowym kontem Expo, **C** to build na własnym komputerze bez chmury.

Instalowalny plik musi być zbudowany z natywnego projektu Androida. Ten projekt celowo nie
trzyma katalogu `android/` w repozytorium — generuje go `expo prebuild` przy każdym buildzie,
więc konfiguracja z `app.json` (nazwa, pakiet, uprawnienia, ikona) jest jedynym źródłem prawdy.

---

## A. GitHub Actions (bez konta Expo) — zalecane

Każdy build robi: `npm ci` → `expo prebuild --platform android` → `gradlew assembleDebug
assembleRelease` → artefakt z APK. Publiczne repozytorium ma darmowe minuty Actions bez limitu.

### A.1 Wypchnij kod

```bash
git clone https://github.com/korczaszko351-sys/samsung-ar-ekran.git
cd samsung-ar-ekran
# skopiuj tu swoje zmiany, potem:
git add -A && git commit -m "Moje zmiany" && git push
```

Jeśli zakładasz własne repozytorium: **Actions** muszą być włączone
(Settings → Actions → General → Allow all actions).

### A.2 Uruchom build

1. Wejdź w zakładkę **Actions**.
2. Wybierz workflow **Build Android APK** (plik `.github/workflows/android-apk.yml`).
3. Kliknij **Run workflow** → **Run workflow**.
4. Pierwszy build trwa ~10–15 minut (pobieranie Gradle i Android SDK).

Build uruchamia się też automatycznie po każdym pushu na `main` i przy pull requeście.

### A.3 Pobierz APK

1. Wejdź w zakończony run (zielony ✓).
2. Na dole strony, sekcja **Artifacts** → `samsung-ar-ekran-apk-1.0.0-<nr>`.
3. Pobierz ZIP i rozpakuj. W środku:

| Plik | Do czego |
|---|---|
| `samsung-ar-ekran-1.0.0-debug.apk` | do testów, podpisany kluczem debug |
| `samsung-ar-ekran-1.0.0-release.apk` | podpisany Twoim kluczem (jeśli ustawisz sekrety) |
| `samsung-ar-ekran-1.0.0-release-debugsigned.apk` | build release podpisany kluczem debug (gdy brak sekretów) |

Artefakty trzymane są 90 dni.

### A.4 Instalacja na Samsungu

1. Przenieś APK na telefon (kabel USB, dysk w chmurze, e-mail — cokolwiek).
2. Otwórz plik w aplikacji **Moi pliki**.
3. Zezwól na instalację z tego źródła, gdy system zapyta.
4. Po instalacji uruchom **Samsung AR Ekran** → **Uruchom projekcję** → zezwól na aparat.

### A.5 Własny klucz podpisujący (opcjonalnie, ale zalecane)

Bez tego kroku APK release jest podpisany jednorazowym kluczem debug: zainstaluje się, ale
każdy kolejny build będzie „inną aplikacją” (nie zaktualizuje poprzedniej) i Google Play go
odrzuci.

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias samsung-ar-ekran \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass TWOJE_HASLO -keypass TWOJE_HASLO
base64 -w0 release.keystore > release.keystore.base64   # macOS: base64 -i release.keystore -o release.keystore.base64
```

W GitHubie: **Settings → Secrets and variables → Actions → New repository secret**:

| Sekret | Wartość |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | zawartość `release.keystore.base64` |
| `ANDROID_KEYSTORE_PASSWORD` | hasło magazynu kluczy |
| `ANDROID_KEY_ALIAS` | `samsung-ar-ekran` |
| `ANDROID_KEY_PASSWORD` | hasło klucza |

Kolejny build sam wykryje sekrety, wyrówna (`zipalign`) i podpisze APK (`apksigner`), a na
końcu wypisze certyfikat w logu. **Nigdy nie commituj pliku `.keystore`** — `.gitignore` już
go blokuje. Zgubiony klucz = brak możliwości aktualizacji w Google Play, więc zrób kopię.

### A.6 Wersja w GitHub Releases

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Workflow dołączy APK do wydania na stronie **Releases** — wygodny link do wysłania uczniom.

---

## B. EAS Build (darmowe konto Expo)

Wybierz, jeśli chcesz budować z telefonu (EAS CLI w Termuxie) albo potrzebujesz wewnętrznej
dystrybucji z linkiem instalacyjnym.

```bash
npm install -g eas-cli
eas login                 # załóż darmowe konto na https://expo.dev/signup
eas init                  # podepnij projekt do konta
eas build --platform android --profile preview    # → APK
eas build --platform android --profile production # → AAB do Google Play
```

Profil `preview` w `eas.json` ustawia `buildType: apk` i dystrybucję wewnętrzną; `production`
buduje AAB. Darmowy plan EAS ma kolejkę i miesięczny limit buildów — zwykle wystarcza na
kilka wersji miesięcznie. Gotowy link pojawia się na `expo.dev` → projekt → **Builds**.

---

## C. Build lokalny (bez chmury)

Wymaga Node.js 20+, JDK 17 i Android SDK (`ANDROID_HOME`).

```bash
npm ci
npx expo prebuild --platform android --clean
cd android
./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease        # → app/build/outputs/apk/release/app-release.apk
```

Podpisanie lokalne:

```bash
apksigner sign --ks release.keystore --ks-key-alias samsung-ar-ekran \
  --out app-release-signed.apk app-release.apk
```

---

## Rozwiązywanie problemów

| Objaw | Przyczyna i rozwiązanie |
|---|---|
| `npm ci` kończy się błędem `package-lock.json` | lockfile nie pasuje do `package.json` — uruchom `npm install`, zacommituj nowy lockfile |
| Build w Actions: `SDK location not found` | brak kroku `android-actions/setup-android` albo brak `local.properties` — w tym repo krok jest w workflow; w buildzie lokalnym ustaw `ANDROID_HOME` |
| `Gradle build daemon disappeared` | brak pamięci na runnerze — workflow używa `--no-daemon`; lokalnie zwiększ `org.gradle.jvmargs` w `android/gradle.properties` |
| APK nie instaluje się: „App not installed” | na telefonie jest już wersja podpisana innym kluczem — odinstaluj poprzednią albo podpisuj zawsze tym samym kluczem |
| „Install blocked” / „nieznane źródła” | zezwól na instalację z tej aplikacji w ustawieniach Androida |
| Aplikacja startuje, ale ekran jest czarny | brak zgody na aparat — ustawienia systemowe → Uprawnienia → Aparat |
| Plansza ucieka w przeciwną stronę niż telefon | Ustawienia → **Odwróć kierunek przechyłu** |
| Plansza jest za duża / za mała | Ustawienia → **Pole widzenia aparatu** (45–55° dla większości Galaxy) |
| `expo prebuild` nie widzi ikony | uruchom `node scripts/make-icon.mjs` (to robi też `postinstall`) |

## Co sprawdzić na urządzeniu po instalacji

1. Ekran startowy pokazuje model telefonu (np. „Samsung SM-A…”).
2. **Uruchom projekcję** → podgląd z kamery działa, plansza demonstracyjna jest widoczna.
3. Przeciągnięcie planszy palcem przesuwa ją; suwak rozmiaru zmienia jej wielkość.
4. Obrót telefonu w pionie/poziomie: plansza przesuwa się przeciwnie do ruchu.
5. Wyłącz aparat w ustawieniach systemowych i wróć do aplikacji — powinno pojawić się ciemne
   tło z komunikatem, a plansza nadal ma być widoczna.
