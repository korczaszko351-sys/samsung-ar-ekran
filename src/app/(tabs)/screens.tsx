import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, EmptyState } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { useScreens } from '@/hooks/use-screens';
import {
  canImportFromApps,
  importImageFromApp,
  importTextFromClipboard,
  type ImportResult,
} from '@/lib/import-content';
import type { ScreenContent } from '@/lib/types';

function kindLabel(kind: ScreenContent['kind']): string {
  if (kind === 'image') return 'Obraz z galerii';
  if (kind === 'color') return 'Tło jednolite';
  return 'Tekst';
}

function Thumb({ item }: { item: ScreenContent }) {
  if (item.kind === 'image' && item.imageUri) {
    return <Image source={{ uri: item.imageUri }} style={styles.thumb} contentFit="cover" />;
  }
  return (
    <View style={[styles.thumb, styles.thumbColor, { backgroundColor: item.color }]}>
      <Ionicons
        name={item.kind === 'color' ? 'color-fill-outline' : 'text-outline'}
        size={18}
        color="rgba(255,255,255,0.85)"
      />
    </View>
  );
}

export default function ScreensScreen() {
  const colors = useColors();
  const router = useRouter();
  const { screens, status, activeId, setActiveId, add } = useScreens();
  const [importing, setImporting] = useState<'image' | 'text' | null>(null);

  /** Run an import and report the outcome, so a failure is never silent. */
  const runImport = async (kind: 'image' | 'text') => {
    setImporting(kind);
    try {
      const result: ImportResult =
        kind === 'image' ? await importImageFromApp() : await importTextFromClipboard();
      if (result.status === 'ok') {
        add(result.screen);
      } else if (result.status === 'error') {
        Alert.alert('Nie udało się zaimportować', result.message);
      }
    } finally {
      setImporting(null);
    }
  };

  if (status === 'loading') {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={[styles.lead, { color: colors.muted }]}>
          Plansza to treść, którą zobaczysz na zaznaczonej powierzchni. Wybierz jedną jako aktywną
          — to ona trafi do projekcji.
        </Text>
        <Button
          title="Nowa plansza"
          icon="add"
          onPress={() => router.push('/screen-editor')}
        />
      </Card>

      {canImportFromApps ? (
        <Card>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Z innej aplikacji</Text>
          <Text style={[styles.lead, { color: colors.muted }]}>
            Weź treść, którą zrobiła inna aplikacja, i połóż ją na powierzchni. Obraz z dowolnej
            aplikacji przez systemowy wybór plików albo tekst skopiowany do schowka.
          </Text>
          <View style={styles.importRow}>
            <View style={styles.action}>
              <Button
                title={importing === 'image' ? 'Importuję…' : 'Obraz z aplikacji'}
                variant="secondary"
                icon="image-outline"
                disabled={importing !== null}
                onPress={() => runImport('image')}
              />
            </View>
            <View style={styles.action}>
              <Button
                title={importing === 'text' ? 'Wczytuję…' : 'Tekst ze schowka'}
                variant="secondary"
                icon="clipboard-outline"
                disabled={importing !== null}
                onPress={() => runImport('text')}
              />
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Obraz: w wyborze plików możesz wskazać Galerię, Pliki, Pobrane, Dysk albo dowolną
            aplikację, która udostępnia pliki. Tekst: skopiuj go w innej aplikacji, wróć tutaj i
            wciśnij „Tekst ze schowka”.
          </Text>
        </Card>
      ) : null}

      {screens.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Brak plansz"
          description="Utwórz pierwszą planszę z tekstem, kolorem albo zdjęciem."
        />
      ) : (
        screens.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Card key={item.id}>
              <View style={styles.row}>
                <Thumb item={item} />
                <View style={styles.rowText}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {kindLabel(item.kind)}
                    {isActive ? ' · aktywna' : ''}
                  </Text>
                </View>
                <Button
                  title={isActive ? 'Aktywna' : 'Ustaw'}
                  variant={isActive ? 'ghost' : 'secondary'}
                  onPress={() => setActiveId(item.id)}
                />
              </View>
              <View style={styles.actions}>
                <View style={styles.action}>
                  <Button
                    title="Edytuj"
                    variant="secondary"
                    icon="create-outline"
                    onPress={() => router.push({ pathname: '/screen-editor', params: { id: item.id } })}
                  />
                </View>
                <View style={styles.action}>
                  <Button
                    title="Projektuj"
                    icon="play-outline"
                    onPress={() => {
                      setActiveId(item.id);
                      router.push('/projector');
                    }}
                  />
                </View>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 16 },
  importRow: { flexDirection: 'row', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12 },
  thumb: { width: 46, height: 46, borderRadius: 10 },
  thumbColor: { alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
