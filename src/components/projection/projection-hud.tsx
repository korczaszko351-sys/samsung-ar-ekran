import { StyleSheet, Text, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { clamp } from '@/lib/projection';
import type { ProjectionContent, ProjectionSettings } from '@/lib/types';

type Props = {
  settings: ProjectionSettings;
  content: ProjectionContent;
  /** Scale of the board relative to the camera image height. */
  scale: number;
  distance: number;
  tilt: { pitch: number; roll: number; heading: number | null; available: boolean };
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
export function ProjectionHud({ settings, content, scale, distance, tilt }: Props) {
  const coverage = Math.round(clamp(scale, 0, 2) * 100);
  return (
    <View pointerEvents="none" style={styles.hud}>
      <Row label="Ekran" value={content.title} />
      <Row label="Zajętość kadru" value={`${coverage}%`} />
      <Row label="Odległość" value={`${distance.toFixed(1)} m`} />
      <Row label="FOV aparatu" value={`${settings.fov}°`} />
      <Row label="Krycie" value={`${Math.round(settings.opacity * 100)}%`} />
      <Row
        label="Przechył"
        value={
          tilt.available
            ? `p ${tilt.pitch.toFixed(0)}° · r ${tilt.roll.toFixed(0)}°`
            : 'brak czujników'
        }
      />
      <Row
        label="Azymut"
        value={tilt.heading === null ? 'brak magnetometru' : `${tilt.heading.toFixed(0)}°`}
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
