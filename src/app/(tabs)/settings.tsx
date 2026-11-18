import Constants from 'expo-constants';
import { Linking, StyleSheet, Text } from 'react-native';

import { SliderRow, SwitchRow } from '@/components/controls';
import { Screen } from '@/components/screen';
import { Button, Card } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { DEFAULT_PROJECTION } from '@/lib/defaults';
import { deviceSummary } from '@/lib/device-info';
import type { ProjectionSettings } from '@/lib/types';

/** Projection defaults and the calibration switches that differ between phones. */
export default function SettingsScreen() {
  const colors = useColors();
  const [settings, setSettings] = usePersistentState<ProjectionSettings>(
    'projection-settings',
    DEFAULT_PROJECTION,
  );
  const device = deviceSummary();

  const update = (patch: Partial<ProjectionSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  return (
    <Screen>
      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Kalibracja śledzenia</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Te wartości są punktem wyjścia dla każdej projekcji. Możesz je zmieniać także w trakcie.
        </Text>
        <SliderRow
          label="Pole widzenia aparatu"
          value={settings.fov}
          minimumValue={40}
          maximumValue={75}
          step={1}
          format={(v) => `${v.toFixed(0)}°`}
          onValueChange={(v) => update({ fov: v })}
        />
        <Text style={[styles.hint, { color: colors.muted }]}>
          To najważniejszy parametr śledzenia: z niego wynika ogniskowa kamery, a więc to, jak
          mocno obraz „ucieka” przy obrocie telefonu. Większość Galaxy ma aparat główny o
          pionowym polu widzenia 45–55°. Jeśli obraz przesuwa się za mocno — zmniejsz, jeśli za
          słabo — zwiększ.
        </Text>
        <SliderRow
          label="Wygładzanie czujnika"
          value={settings.smoothing}
          minimumValue={0}
          maximumValue={0.9}
          step={0.05}
          format={(v) => (v === 0 ? 'brak' : v.toFixed(2))}
          onValueChange={(v) => update({ smoothing: v })}
        />
        <Text style={[styles.hint, { color: colors.muted }]}>
          Więcej wygładzania = spokojniejszy obraz, ale wolniejsza reakcja na ruch. 0,2–0,4 to
          dobry kompromis na lekcji.
        </Text>
        <SwitchRow
          label="Odwróć kierunek śledzenia"
          description="Włącz, jeśli obraz ucieka w przeciwną stronę niż telefon"
          value={settings.invertRotation}
          onValueChange={(value) => update({ invertRotation: value })}
        />
        <SwitchRow
          label="Śledzenie powierzchni domyślnie"
          value={settings.tracking}
          onValueChange={(value) => update({ tracking: value })}
        />
        <SwitchRow
          label="Odczyt techniczny w projekcji"
          description="Pokazuje tryb śledzenia, FOV i przechył"
          value={settings.diagnostics}
          onValueChange={(value) => update({ diagnostics: value })}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Jak zaznaczyć powierzchnię</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          1. Uruchom projekcję i skieruj aparat na stół, podłogę albo ścianę.
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          2. Przeciągnij cztery uchwyty (1–4) na rogi tej powierzchni — kolejność: lewy górny,
          prawy górny, prawy dolny, lewy dolny.
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          3. Zatwierdź. Obraz zostanie wpisany w ten czworokąt w perspektywie i będzie na nim
          leżał, gdy obrócisz telefon.
        </Text>
        <Text style={[styles.hint, { color: colors.muted }]}>
          Im dokładniej zaznaczysz rogi, tym lepiej obraz „przylega” do powierzchni. Po
          zatwierdzeniu możesz zaznaczyć powierzchnię ponownie w każdej chwili.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Uprawnienia</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Aparat jest potrzebny jako tło projekcji, a czujnik obrotu do utrzymania obrazu na
          powierzchni. Oba uprawnienia możesz w każdej chwili odebrać w ustawieniach systemu —
          aplikacja pokaże wtedy ciemne tło i nadal wyświetli obraz.
        </Text>
        <Button
          title="Otwórz ustawienia systemowe"
          variant="secondary"
          icon="settings-outline"
          onPress={() => {
            Linking.openSettings().catch(() => undefined);
          }}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Urządzenie</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {device.manufacturer} {device.model}
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>{device.os}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Wersja aplikacji {Constants.expoConfig?.version ?? '2.0.0'}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>O aplikacji</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Samsung AR Ekran wpisuje obraz w zaznaczoną płaską powierzchnię i utrzymuje go tam
          czujnikiem obrotu. Nie używa ARCore, nie wysyła danych do internetu i nie wymaga konta.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 12, lineHeight: 16 },
});
