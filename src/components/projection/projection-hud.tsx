import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import type { ProjectionContent, ProjectionSettings } from '@/lib/types';

type Props = {
  settings: ProjectionSettings;
  content: ProjectionContent;
  /** True when the surface is anchored and the image is being warped onto it. */
  anchored: boolean;
  pose: { pitchDeg: number; rollDeg: number; available: boolean };
  tracking: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Compact technical readout: what the app knows about the projection right now. */
export function ProjectionHud({ settings, content, anchored, pose, tracking }: Props) {
  return (
    <View pointerEvents="none" style={styles.hud}>
      <Row label="Ekran" value={content.title} />
      <Row label="Powierzchnia" value={anchored ? 'zakotwiczona' : 'nie zaznaczona'} />
      <Row label="Śledzenie" value={tracking} />
      <Row label="FOV aparatu" value={`${settings.fov}°`} />
      <Row label="Rozmiar" value={`${settings.size.toFixed(2)}×`} />
      <Row label="Krycie" value={`${Math.round(settings.opacity * 100)}%`} />
      <Row
        label="Przechył"
        value={
          pose.available
            ? `p ${pose.pitchDeg.toFixed(0)}° · r ${pose.rollDeg.toFixed(0)}°`
            : 'brak czujnika'
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(6,10,18,0.55)',
    gap: 1,
    maxWidth: 230,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  label: { color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 0.4 },
  value: { color: '#E6F6FF', fontSize: 10, fontWeight: '600' },
});
