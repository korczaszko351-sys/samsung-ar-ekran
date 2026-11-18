import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { projectionColors } from '@/constants/theme';
import type { ProjectionContent } from '@/lib/types';

type Props = {
  content: ProjectionContent;
  /** Width of the image plane before the homography warps it. */
  width: number;
  height: number;
  /** 0–1 opacity of the whole image. */
  opacity: number;
  /**
   * Column-major 4x4 that maps this view onto the surface quad. Null means "no usable
   * quad yet", in which case the image is drawn flat and centred.
   */
  matrix: number[] | null;
};

/**
 * The projected image: a translucent board with a glowing bezel, the user's content and a
 * soft vignette so it reads as light on a surface rather than a flat sticker.
 *
 * The perspective comes from `matrix` — a real homography, so the image lies on the
 * surface instead of being a rectangle with a rotation.
 */
export function ProjectedScreen({ content, width, height, opacity, matrix }: Props) {
  const mirrored = content.mirror;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.board,
        {
          width,
          height,
          opacity,
          transform: matrix ? [{ matrix }] : [],
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
  board: { position: 'absolute', top: 0, left: 0, borderRadius: 10 },
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
