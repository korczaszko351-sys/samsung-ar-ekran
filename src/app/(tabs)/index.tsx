import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card } from '@/components/ui';
import { projectionColors, spacing, useColors } from '@/constants/theme';
import { useScreens } from '@/hooks/use-screens';
import { deviceSummary } from '@/lib/device-info';

const STEPS = [
  {
    icon: 'albums-outline' as const,
    title: '1. Przygotuj planszę',
    text: 'Tekst, kolor tła albo zdjęcie z galerii. Plansza to treść, którą zobaczysz na wirtualnym ekranie.',
  },
  {
    icon: 'scan-outline' as const,
    title: '2. Wyceluj telefon',
    text: 'Skieruj aparat na ścianę lub tablicę. Obraz z kamery jest tłem projekcji — bez ARCore i bez dodatkowych usług Google.',
  },
  {
    icon: 'move-outline' as const,
    title: '3. Ustaw i zablokuj',
    text: 'Przeciągnij planszę palcem, dopasuj rozmiar i odległość. Stabilizacja czujnikami utrzyma ją w miejscu, gdy ruszysz telefonem.',
  },
];

/** Start screen: what the app does, and the one button that matters. */
export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { screens, active } = useScreens();
  const device = deviceSummary();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroBadge}>
          <Ionicons name="phone-portrait-outline" size={13} color={projectionColors.cyan} />
          <Text style={styles.heroBadgeText}>{device.isSamsung ? 'Samsung Galaxy' : device.manufacturer}</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>Wirtualny ekran{`\n`}bez ARCore</Text>
        <Text style={[styles.heroText, { color: colors.muted }]}>
          Projekcja obrazu na dowolną powierzchnię, którą widzi aparat. Działa na telefonach
          Samsung, na których Środowisko Google AR jest niedostępne, zablokowane albo po prostu
          niepotrzebne.
        </Text>
        <Button
          title="Uruchom projekcję"
          icon="play"
          onPress={() => router.push('/projector')}
        />
        <Text style={[styles.heroMeta, { color: colors.muted }]}>
          {active ? `Na ekranie: ${active.title}` : `Zapisane plansze: ${screens.length}`}
        </Text>
      </View>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Jak to działa</Text>
        {STEPS.map((step) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.stepIcon, { backgroundColor: colors.background }]}>
              <Ionicons name={step.icon} size={18} color={colors.accent} />
            </View>
            <View style={styles.stepText}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.stepBody, { color: colors.muted }]}>{step.text}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Czym to się różni od ARCore</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          ARCore rozpoznaje płaszczyzny i mierzy głębię. Tutaj tego nie ma: powierzchnię wybierasz
          sam, a rozmiar planszy wynika z podanej odległości i pola widzenia aparatu. Dzięki temu
          aplikacja nie wymaga Środowiska Google AR ani Play Services for AR.
        </Text>
        <View style={styles.chips}>
          {['Bez ARCore', 'Bez internetu', 'Dane tylko na telefonie'].map((chip) => (
            <View key={chip} style={[styles.chip, { borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.muted }]}>{chip}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Twoje urządzenie</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {device.manufacturer} {device.model} · {device.os}
        </Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {device.isSamsung
            ? 'Model Samsung — aplikacja korzysta wyłącznie z aparatu i czujników telefonu.'
            : 'Aplikacja działa też na innych telefonach z Androidem; interfejs jest dostosowany do Samsungów.'}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: '#0B1226',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(34,211,238,0.16)',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(34,211,238,0.12)',
  },
  heroBadgeText: { color: projectionColors.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  heroTitle: { fontSize: 27, fontWeight: '800', lineHeight: 33, letterSpacing: -0.4 },
  heroText: { fontSize: 14, lineHeight: 20 },
  heroMeta: { fontSize: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  stepBody: { fontSize: 13, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: '600' },
});
