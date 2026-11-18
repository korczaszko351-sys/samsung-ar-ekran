import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, EmptyState } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { useScreens } from '@/hooks/use-screens';
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
        name={item.kind === 'text' ? 'text-outline' : 'color-fill-outline'}
        size={20}
        color="rgba(255,255,255,0.85)"
      />
    </View>
  );
}

/** The user's saved screens: what the projector can show. */
export default function ScreensScreen() {
  const colors = useColors();
  const router = useRouter();
  const { screens, status, activeId, setActiveId } = useScreens();

  if (status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  if (status === 'error') {
    return (
      <Screen>
        <EmptyState
          icon="alert-circle-outline"
          title="Nie udało się wczytać plansz"
          message="Zapisane dane są nieczytelne. Uruchom aplikację ponownie — nic nie zostało nadpisane."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Text style={[styles.lead, { color: colors.text }]}>
          Plansza to obraz, który widzisz na wirtualnym ekranie. Możesz jej użyć jako tablicy,
          planszy informacyjnej albo tła do prezentacji.
        </Text>
        <Button
          title="Nowa plansza"
          icon="add"
          onPress={() => router.push('/screen-editor')}
        />
      </Card>

      {screens.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title="Brak zapisanych plansz"
          message="Dodaj pierwszą planszę — tekst, kolor tła albo zdjęcie z galerii."
          actionTitle="Dodaj planszę"
          onAction={() => router.push('/screen-editor')}
        />
      ) : (
        screens.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Card key={item.id} onPress={() => setActiveId(item.id)}>
              <View style={styles.row}>
                <Thumb item={item} />
                <View style={styles.rowText}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {kindLabel(item.kind)}
                    {item.mirror ? ' · lustro' : ''}
                  </Text>
                </View>
                {isActive ? (
                  <View style={[styles.activePill, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.activeText, { color: colors.onPrimary }]}>Na ekranie</Text>
                  </View>
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={colors.muted} />
                )}
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
                    icon="play"
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, gap: 2 },
  thumb: { width: 52, height: 30, borderRadius: 6 },
  thumbColor: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12 },
  activePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  activeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  action: { flex: 1 },
});
