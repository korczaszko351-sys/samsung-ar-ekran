import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { SwitchRow } from '@/components/controls';
import { Screen } from '@/components/screen';
import { Button, Card, ConfirmDialog, TextField } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { useScreens } from '@/hooks/use-screens';
import { BACKGROUND_COLORS } from '@/lib/defaults';
import { importImage } from '@/lib/media';
import type { ScreenContent, ScreenKind } from '@/lib/types';

const KINDS: { key: ScreenKind; label: string; icon: 'text-outline' | 'color-fill-outline' | 'image-outline' }[] = [
  { key: 'text', label: 'Tekst', icon: 'text-outline' },
  { key: 'color', label: 'Kolor', icon: 'color-fill-outline' },
  { key: 'image', label: 'Obraz', icon: 'image-outline' },
];

/** Create or edit one screen. */
export default function ScreenEditor() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { screens, status, add, update, remove } = useScreens();

  const existing = useMemo(
    () => screens.find((item) => item.id === params.id) ?? null,
    [screens, params.id],
  );

  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<ScreenKind>(existing?.kind ?? 'text');
  const [text, setText] = useState(existing?.text ?? '');
  const [color, setColor] = useState(existing?.color ?? BACKGROUND_COLORS[0]);
  const [imageUri, setImageUri] = useState<string | null>(existing?.imageUri ?? null);
  const [mirror, setMirror] = useState(existing?.mirror ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pickImage = async () => {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Brak dostępu do galerii. Zezwól na niego w ustawieniach telefonu.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      setBusy(true);
      const durable = await importImage(result.assets[0].uri);
      setImageUri(durable);
      setKind('image');
    } catch {
      setError('Nie udało się wczytać obrazu. Spróbuj wybrać inne zdjęcie.');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      setError('Podaj nazwę planszy.');
      return;
    }
    if (kind === 'image' && !imageUri) {
      setError('Wybierz obraz z galerii.');
      return;
    }
    if (kind === 'text' && text.trim().length === 0) {
      setError('Wpisz treść, która ma się pojawić na planszy.');
      return;
    }
    setError(null);
    Haptics.selectionAsync().catch(() => undefined);

    if (existing) {
      update(existing.id, { title: cleanTitle, kind, text, color, imageUri, mirror });
    } else {
      const created: ScreenContent = {
        id: `screen-${Date.now()}`,
        title: cleanTitle,
        kind,
        text,
        color,
        imageUri,
        mirror,
        createdAt: Date.now(),
      };
      add(created);
    }
    router.back();
  };

  if (params.id && status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <TextField
          label="Nazwa planszy"
          value={title}
          onChangeText={setTitle}
          placeholder="np. Tablica — układ krwionośny"
          maxLength={60}
          error={error && title.trim().length === 0 ? error : null}
        />
        <Text style={[styles.label, { color: colors.text }]}>Rodzaj zawartości</Text>
        <View style={styles.kindRow}>
          {KINDS.map((option) => {
            const selected = option.key === kind;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setKind(option.key);
                  setError(null);
                }}
                style={[
                  styles.kindChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={selected ? colors.onPrimary : colors.muted}
                />
                <Text
                  style={[
                    styles.kindText,
                    { color: selected ? colors.onPrimary : colors.text },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {kind === 'text' ? (
        <Card>
          <TextField
            label="Treść na planszy"
            value={text}
            onChangeText={setText}
            placeholder="Wpisz tekst, który ma być widoczny na wirtualnym ekranie"
            multiline
            numberOfLines={5}
            maxLength={600}
            style={styles.multiline}
          />
        </Card>
      ) : null}

      {kind === 'image' ? (
        <Card>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} contentFit="contain" />
          ) : (
            <View style={[styles.preview, styles.previewEmpty, { borderColor: colors.border }]}>
              <Ionicons name="image-outline" size={32} color={colors.muted} />
              <Text style={[styles.previewText, { color: colors.muted }]}>Nie wybrano obrazu</Text>
            </View>
          )}
          <Button
            title={imageUri ? 'Zmień obraz' : 'Wybierz obraz z galerii'}
            variant="secondary"
            icon="images-outline"
            loading={busy}
            onPress={pickImage}
          />
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.label, { color: colors.text }]}>Kolor tła</Text>
        <View style={styles.swatches}>
          {BACKGROUND_COLORS.map((option) => {
            const selected = option.toLowerCase() === color.toLowerCase();
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Kolor ${option}`}
                accessibilityState={{ selected }}
                onPress={() => setColor(option)}
                style={[
                  styles.swatch,
                  { backgroundColor: option, borderColor: selected ? colors.accent : colors.border },
                  selected && styles.swatchSelected,
                ]}
              />
            );
          })}
        </View>
        <SwitchRow
          label="Odbicie lustrzane"
          description="Przydatne, gdy obraz ma padać na ścianę odwróconą od telefonu"
          value={mirror}
          onValueChange={setMirror}
        />
      </Card>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <Button title={existing ? 'Zapisz zmiany' : 'Dodaj planszę'} icon="checkmark" onPress={save} />
      {existing ? (
        <Button
          title="Usuń planszę"
          variant="ghost"
          icon="trash-outline"
          onPress={() => setConfirmDelete(true)}
        />
      ) : null}

      <ConfirmDialog
        visible={confirmDelete}
        title="Usunąć planszę?"
        message="Plansza zniknie z listy, a jej obraz zostanie usunięty z telefonu."
        confirmTitle="Usuń"
        cancelTitle="Anuluj"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (existing) {
            remove(existing.id)
              .then(() => router.back())
              .catch(() => setError('Nie udało się usunąć planszy.'));
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600' },
  kindRow: { flexDirection: 'row', gap: spacing.sm },
  kindChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  kindText: { fontSize: 13, fontWeight: '600' },
  multiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: spacing.sm },
  preview: { width: '100%', height: 170, borderRadius: 12, backgroundColor: '#0B1226' },
  previewEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  previewText: { fontSize: 13 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: { width: 40, height: 40, borderRadius: 10, borderWidth: 2 },
  swatchSelected: { borderWidth: 3 },
  error: { fontSize: 13 },
});
