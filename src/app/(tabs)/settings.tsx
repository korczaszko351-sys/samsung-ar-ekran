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
        <Text style={[styles.cardTitle, { color: colors.text }]}>Kalibracja projekcji</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Te wartości są punktem wyjścia dla każdej planszy. Możesz je zmieniać także w trakcie
          projekcji.
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
          Większość telefonów Galaxy ma aparat główny o pionowym polu widzenia 45–55°. Zmniejsz,
          jeśli plansza wydaje się za duża.
        </Text>
        <SliderRow
          label="Wygładzanie czujników"
          value={settings.smoothing}
          minimumValue={0}
          maximumValue={0.9}
          step={0.05}
          format={(v) => (v === 0 ? 'brak' : v.toFixed(2))}
          onValueChange={(v) => update({ smoothing: v })}
        />
        <SwitchRow
          label="Odwróć kierunek przechyłu"
          description="Włącz, jeśli plansza ucieka w przeciwną stronę niż telefon"
          value={settings.invertTilt}
          onValueChange={(value) => update({ invertTilt: value })}
        />
        <SwitchRow
          label="Stabilizacja czujnikami domyślnie"
          value={settings.sensorFollow}
          onValueChange={(value) => update({ sensorFollow: value })}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Uprawnienia</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Aparat jest potrzebny jako tło projekcji, a czujniki ruchu do stabilizacji planszy.
          Oba uprawnienia możesz w każdej chwili odebrać w ustawieniach systemu — aplikacja
          pokaże wtedy ciemne tło i nadal wyświetli planszę.
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
          Wersja aplikacji {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>O aplikacji</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          Samsung AR Ekran rysuje wirtualny ekran na obrazie z kamery i stabilizuje go
          akcelerometrem. Nie używa ARCore, nie wysyła danych do internetu i nie wymaga konta.
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
