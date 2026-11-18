import Slider from '@react-native-community/slider';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { spacing, useColors } from '@/constants/theme';

type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Labelled on/off row used in the projector controls and settings. */
export function SwitchRow({ label, description, value, onValueChange, disabled }: SwitchRowProps) {
  const colors = useColors();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: colors.muted }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={value ? colors.onPrimary : undefined}
      />
    </View>
  );
}

type SliderRowProps = {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  format?: (value: number) => string;
  onValueChange: (value: number) => void;
};

/** Labelled slider with a live value readout. */
export function SliderRow({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 0.01,
  format,
  onValueChange,
}: SliderRowProps) {
  const colors = useColors();
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.accent }]}>
          {format ? format(value) : value.toFixed(2)}
        </Text>
      </View>
      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  switchText: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '600' },
  description: { fontSize: 12, lineHeight: 16 },
  sliderBlock: { gap: 2 },
  value: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
