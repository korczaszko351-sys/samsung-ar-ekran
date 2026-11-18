# Pierwszy build — wynik

Build z `main` przeszedł na GitHub Actions (run #10, workflow **Build Android APK**).

- Run: https://github.com/korczaszko351-sys/samsung-ar-ekran/actions/runs/44250805043
- Artefakt: `samsung-ar-ekran-apk-1.0.0-10` (~151 MB ZIP, dwa APK w środku)
- Kroki: `npm install` → `expo prebuild` → `gradlew assembleDebug assembleRelease` → artefakt — wszystkie zielone
- Podpisanie: krok pominięty, bo nie ma jeszcze sekretów z keystore, więc
  `samsung-ar-ekran-1.0.0-release-debugsigned.apk` jest podpisany kluczem debug

## Co poprawiono po drodze

| Objaw | Przyczyna | Poprawka |
|---|---|---|
| Workflow nie tworzył żadnego joba | `if: ${{ secrets.X != '' }}` — GitHub nie pozwala czytać `secrets` w `if:` | osobny krok wykrywa keystore i publikuje wynik jako output |
| Job padał na 2. kroku | `setup-node` z `cache: npm` wymaga `package-lock.json` | cache usunięty, instalacja przez `npm install` |
| Job padał na 5. kroku | `android-actions/setup-android` na tym obrazie runnera | korzystamy z preinstalowanego SDK (`ANDROID_HOME`) i akceptujemy licencje |

## Jak dostać APK

Actions → **Build Android APK** → wybierz run → sekcja **Artifacts** → pobierz ZIP.
Plik `…-release-debugsigned.apk` (ok. 126 MB) instaluje się na Samsungu po zezwoleniu na
instalację z nieznanych źródeł. `…-debug.apk` ma ok. 260 MB i służy do testów.

Aby APK był podpisany własnym kluczem (aktualizacje w miejscu, Google Play) — dodaj cztery
sekrety opisane w [BUILD_APK.md](BUILD_APK.md) i uruchom build ponownie.
