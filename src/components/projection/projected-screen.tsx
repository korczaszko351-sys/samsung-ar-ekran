import { Image } from 'expo-image';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { projectionColors } from '@/constants/theme';
import type { ProjectionContent } from '@/lib/types';

type Props = {
  content: ProjectionContent;
  /** Width of the projected board in pixels. */
  width: number;
  /** 0–1 opacity of the whole image. */
  opacity: number;
  /** Left edge inside the stage. */
  left: number;
  /** Top edge inside the stage. */
  top: number;
  /** Rotate to follow the phone's pitch (degrees). */
  rotateX: number;
  rotateY: number;
  /** Show a quick-fade pick-and-place hint. */
  onLayout?: (event: LayoutChangeEvent) => void;
};

/**
 * The projected image: a translucent board with a glowing bezel, the user's content and a
 * soft vignette so it reads as light on a surface rather than a flat sticker.
 */
export function ProjectedScreen({ content, width, opacity, left, top, rotateX, rotateY, onLayout }: Props) {
  const mirrored = content.mirror;
  const height = width * (9 / 16);
  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        styles.board,
        {
          width,
          height,
          left,
          top,
          opacity,
          transform: [{ perspective: 900 }, { rotateX: `${rotateX}deg` }, { rotateY: `${rotateY}deg` }],
        },
      ]}>
      <View style={[styles.surface, { backgroundColor: content.color }]}>
        {content.kind === 'image' && content.imageUri ? (
          <Image
            source={{ uri: content.imageUri }}
            style={[styles.image, mirrored && styles.mirrored]}
            contentFit="contain"
            transition={160}
            accessibilityLabel={content.title}
          />
        ) : null}
        {content.kind === 'text' ? (
          <View style={styles.textWrap}>
            <Text style={[styles.title, styles.pickable]} numberOfLines={2}>
              {content.title}
            </Text>
            <Text style={[styles.body, styles.pickable]} numberOfLines={8}>
              {content.text}
            </Text>
          </View>
        ) : null}
        {content.kind === 'color' ? (
          <View style={styles.textWrap}>
            <Text style={[styles.swatchNote, styles.pickable]} numberOfLines={2}>
              {content.title}
            </Text>
          </View>
        ) : null}
        <View style={styles.vignette} />
      </View>
      <View style={styles.bezel} />
    </View>
  );
}

const styles = StyleSheet.create({
  board: { position: 'absolute', borderRadius: 10 },
  surface: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  mirrored: { transform: [{ scaleX: -1 }] },
  textWrap: { paddingHorizontal: 18, paddingVertical: 14, gap: 6, alignItems: 'center' },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 6,
  },
  body: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  swatchNote: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  pickable: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4 },
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  bezel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: projectionColors.bezel,
    shadowColor: projectionColors.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
