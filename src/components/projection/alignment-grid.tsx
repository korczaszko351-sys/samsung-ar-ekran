import { StyleSheet, View } from 'react-native';

import { projectionColors } from '@/constants/theme';

const ROWS = 6;
const COLS = 4;

/** Alignment guide: a faint grid plus a centre crosshair, drawn over the camera image. */
export function AlignmentGrid() {
  return (
    <View pointerEvents="none" style={styles.root}>
      {Array.from({ length: ROWS - 1 }, (_, i) => (
        <View key={`h${i}`} style={[styles.hLine, { top: `${((i + 1) / ROWS) * 100}%` }]} />
      ))}
      {Array.from({ length: COLS - 1 }, (_, i) => (
        <View key={`v${i}`} style={[styles.vLine, { left: `${((i + 1) / COLS) * 100}%` }]} />
      ))}
      <View style={styles.crossH} />
      <View style={styles.crossV} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: projectionColors.grid },
  vLine: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: projectionColors.grid },
  crossH: {
    position: 'absolute',
    top: '50%',
    left: '42%',
    right: '42%',
    height: 1.5,
    backgroundColor: projectionColors.cyan,
  },
  crossV: {
    position: 'absolute',
    left: '50%',
    top: '46%',
    bottom: '46%',
    width: 1.5,
    backgroundColor: projectionColors.cyan,
  },
});
