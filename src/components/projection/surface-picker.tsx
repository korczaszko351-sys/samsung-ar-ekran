import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { projectionColors } from '@/constants/theme';
import { clamp } from '@/lib/projection';
import type { Point } from '@/lib/homography';

type Props = {
  /** Corners in TL, TR, BR, BL order, each coordinate 0–1 of the stage. */
  quad: Point[];
  onChange: (quad: Point[]) => void;
  stage: { width: number; height: number };
};

const LABELS = ['1', '2', '3', '4'];
const HANDLE = 44;

/** One draggable corner. Its own PanResponder keeps the drag maths local. */
function Corner({
  index,
  point,
  stage,
  onMove,
}: {
  index: number;
  point: Point;
  stage: { width: number; height: number };
  onMove: (index: number, next: Point) => void;
}) {
  const start = useRef<Point>(point);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          start.current = point;
        },
        onPanResponderMove: (_event, gesture) => {
          if (stage.width <= 0 || stage.height <= 0) return;
          onMove(index, {
            x: clamp(start.current.x + gesture.dx / stage.width, 0, 1),
            y: clamp(start.current.y + gesture.dy / stage.height, 0, 1),
          });
        },
      }),
    [index, point, stage.width, stage.height, onMove],
  );

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.handle,
        {
          left: point.x * stage.width - HANDLE / 2,
          top: point.y * stage.height - HANDLE / 2,
        },
      ]}>
      <View style={styles.handleDot}>
        <Text style={styles.handleText}>{LABELS[index]}</Text>
      </View>
    </View>
  );
}

/**
 * Marks a flat surface with four corners. The user drags each corner onto a corner of the
 * table, floor or wall; the quad between them is the surface the image will lie on.
 */
export function SurfacePicker({ quad, onChange, stage }: Props) {
  const edges = useMemo(() => {
    return quad.map((from, index) => {
      const to = quad[(index + 1) % quad.length];
      const x1 = from.x * stage.width;
      const y1 = from.y * stage.height;
      const x2 = to.x * stage.width;
      const y2 = to.y * stage.height;
      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
      return { key: `edge-${index}`, x1, y1, length, angle };
    });
  }, [quad, stage.width, stage.height]);

  const move = (index: number, next: Point) => {
    onChange(quad.map((point, i) => (i === index ? next : point)));
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {edges.map((edge) =>
        edge.length > 0 ? (
          <View
            key={edge.key}
            pointerEvents="none"
            style={[
              styles.edge,
              {
                left: edge.x1,
                top: edge.y1,
                width: edge.length,
                transform: [{ rotate: `${edge.angle}deg` }],
              },
            ]}
          />
        ) : null,
      )}
      {quad.map((point, index) => (
        <Corner key={`corner-${index}`} index={index} point={point} stage={stage} onMove={move} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    height: 2,
    backgroundColor: projectionColors.cyan,
    transformOrigin: 'left center',
  },
  handle: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,10,18,0.75)',
    borderWidth: 2,
    borderColor: projectionColors.cyan,
  },
  handleText: { color: '#E6F6FF', fontSize: 12, fontWeight: '800' },
});
