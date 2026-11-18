import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SliderRow, SwitchRow } from '@/components/controls';
import { AlignmentGrid } from '@/components/projection/alignment-grid';
import { ProjectedScreen } from '@/components/projection/projected-screen';
import { ProjectionHud } from '@/components/projection/projection-hud';
import { Button } from '@/components/ui';
import { projectionColors, spacing } from '@/constants/theme';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { useScreens } from '@/hooks/use-screens';
import { useTilt } from '@/hooks/use-tilt';
import { DEFAULT_PROJECTION, DEMO_CONTENT } from '@/lib/defaults';
import { clamp, effectiveDistance, projectedScale } from '@/lib/projection';
import type { ProjectionSettings } from '@/lib/types';

type Stage = { width: number; height: number };
type Offset = { x: number; y: number };

/**
 * The projection itself. The camera feed is the background (no ARCore involved), the
 * chosen screen is drawn as a glowing board on top, and the phone's accelerometer keeps
 * that board visually stable while the phone turns.
 */
export default function ProjectorScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [settings, setSettings] = usePersistentState<ProjectionSettings>(
    'projection-settings',
    DEFAULT_PROJECTION,
  );
  const { active, update: updateScreen } = useScreens();
  const [stage, setStage] = useState<Stage>({ width: 0, height: 0 });
  const [controlsOpen, setControlsOpen] = useState(true);
  const [anchor, setAnchor] = useState<Offset | null>(null);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [helpVisible, setHelpVisible] = useState(true);

  const tilt = useTilt(settings.smoothing, settings.sensorFollow);

  const content = active ?? DEMO_CONTENT;
  const mirror = active ? active.mirror : settings.mirror;

  const scale = projectedScale(settings);
  const distance = effectiveDistance(settings);
  const boardWidth = stage.height > 0 ? stage.height * scale : 0;
  const boardHeight = boardWidth * (9 / 16);

  // The board hangs at a fixed point in the world: when the phone tilts, it slides the
  // other way, exactly like a sticker on a wall seen through a moving window.
  const reference = useRef<Offset | null>(null);

  useEffect(() => {
    if (!settings.sensorFollow || !tilt.available || stage.height <= 0) return;
    if (!reference.current) {
      reference.current = { x: tilt.roll, y: tilt.pitch };
      setOffset({ x: 0, y: 0 });
      return;
    }
    const direction = settings.invertTilt ? -1 : 1;
    const pixelsPerDegree = stage.height / settings.fov;
    const dPitch = tilt.pitch - reference.current.y;
    const dRoll = tilt.roll - reference.current.x;
    setOffset({
      y: direction * dPitch * pixelsPerDegree * 0.9,
      x: -direction * dRoll * pixelsPerDegree * 0.6,
    });
  }, [tilt, settings.sensorFollow, settings.invertTilt, settings.fov, stage.height]);

  // Where the board sits: the user's drag anchor, or the middle of the stage.
  const baseLeft = anchor ? anchor.x : stage.width / 2 - boardWidth / 2;
  const baseTop = anchor ? anchor.y : stage.height / 2 - boardHeight / 2;
  const boardLeft = clamp(baseLeft + offset.x, -boardWidth * 0.5, stage.width - boardWidth * 0.5);
  const boardTop = clamp(baseTop + offset.y, -boardHeight * 0.5, stage.height - boardHeight * 0.5);

  const recentre = useCallback(() => {
    setAnchor(null);
    reference.current = null;
    setOffset({ x: 0, y: 0 });
  }, []);

  const dragStart = useRef<Offset | null>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          dragStart.current = { x: baseLeft, y: baseTop };
          setHelpVisible(false);
        },
        onPanResponderMove: (_event, gesture) => {
          const start = dragStart.current;
          if (!start || boardWidth === 0) return;
          setAnchor({
            x: clamp(start.x + gesture.dx, -boardWidth * 0.5, stage.width - boardWidth * 0.5),
            y: clamp(start.y + gesture.dy, -boardHeight * 0.5, stage.height - boardHeight * 0.5),
          });
        },
        onPanResponderRelease: () => {
          dragStart.current = null;
        },
      }),
    [baseLeft, baseTop, boardWidth, boardHeight, stage.width, stage.height],
  );

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  const update = useCallback(
    (patch: Partial<ProjectionSettings>) => setSettings((prev) => ({ ...prev, ...patch })),
    [setSettings],
  );

  const toggleMirror = () => {
    if (active) {
      // Mirroring a saved screen belongs to the screen itself.
      updateScreen(active.id, { mirror: !active.mirror });
      return;
    }
    update({ mirror: !settings.mirror });
  };

  const cameraReady = Platform.OS !== 'web' && permission?.granted === true;

  return (
    <View style={styles.root}>
      {cameraReady ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" animateShutter={false} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="videocam-off-outline" size={44} color={projectionColors.cyan} />
          <Text style={styles.fallbackTitle}>
            {Platform.OS === 'web'
              ? 'Podgląd kamery niedostępny w przeglądarce'
              : 'Brak dostępu do aparatu'}
          </Text>
          <Text style={styles.fallbackText}>
            {Platform.OS === 'web'
              ? 'Na telefonie z Androidem aparat działa normalnie. Tutaj widzisz samą planszę projekcji.'
              : 'Projekcja jest widoczna na ciemnym tle. Zezwól na aparat, aby zobaczyć ją na obrazie z kamery.'}
          </Text>
          {Platform.OS !== 'web' ? (
            <View style={styles.fallbackAction}>
              <Button
                title={permission?.canAskAgain === false ? 'Otwórz ustawienia' : 'Zezwól na aparat'}
                icon="camera-outline"
                onPress={() => {
                  if (permission?.canAskAgain === false) {
                    router.push('/settings');
                  } else {
                    requestPermission().catch(() => undefined);
                  }
                }}
              />
            </View>
          ) : null}
        </View>
      )}

      <View style={StyleSheet.absoluteFill} onLayout={onStageLayout} {...panResponder.panHandlers}>
        {settings.grid ? <AlignmentGrid /> : null}
        {boardWidth > 0 ? (
          <ProjectedScreen
            content={{ ...content, mirror }}
            width={boardWidth}
            opacity={settings.opacity}
            left={boardLeft}
            top={boardTop}
            rotateX={settings.sensorFollow ? clamp(offset.y / 60, -8, 8) : 0}
            rotateY={settings.sensorFollow ? clamp(offset.x / 60, -10, 10) : 0}
          />
        ) : null}
      </View>

      <SafeAreaView pointerEvents="box-none" edges={['top']} style={styles.topBar}>
        <View pointerEvents="box-none" style={styles.topInner}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zamknij projekcję"
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.iconButton}>
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </Pressable>
          {settings.sensorFollow ? (
            <View style={styles.badge}>
              <View style={styles.dot} />
              <Text style={styles.badgeText}>Czujniki aktywne</Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Wyśrodkuj planszę"
            onPress={recentre}
            hitSlop={8}
            style={styles.iconButton}>
            <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {cameraReady && !controlsOpen ? (
        <ProjectionHud settings={settings} content={content} scale={scale} distance={distance} tilt={tilt} />
      ) : null}

      {helpVisible ? (
        <View pointerEvents="none" style={styles.helpPill}>
          <Ionicons name="hand-left-outline" size={14} color="#E6F6FF" />
          <Text style={styles.helpText}>Przeciągnij, aby ustawić planszę</Text>
        </View>
      ) : null}

      <View style={styles.tray}>
        {controlsOpen ? (
          <View style={styles.trayPanel}>
            <View style={styles.trayHandleRow}>
              <Text style={styles.trayTitle}>Sterowanie projekcją</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ukryj sterowanie"
                onPress={() => setControlsOpen(false)}
                hitSlop={8}>
                <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
            <SliderRow
              label="Rozmiar planszy"
              value={settings.size}
              minimumValue={0.4}
              maximumValue={2}
              step={0.05}
              format={(v) => `${v.toFixed(2)}×`}
              onValueChange={(v) => update({ size: v })}
            />
            <SliderRow
              label="Odległość od powierzchni"
              value={settings.distance}
              minimumValue={0.5}
              maximumValue={10}
              step={0.1}
              format={(v) => `${v.toFixed(1)} m`}
              onValueChange={(v) => update({ distance: v })}
            />
            <SliderRow
              label="Krycie obrazu"
              value={settings.opacity}
              minimumValue={0.2}
              maximumValue={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onValueChange={(v) => update({ opacity: v })}
            />
            <View style={styles.toggles}>
              <SwitchRow
                label="Stabilizacja czujnikami"
                description="Plansza zostaje w miejscu, gdy ruszasz telefonem"
                value={settings.sensorFollow}
                onValueChange={(value) => {
                  Haptics.selectionAsync().catch(() => undefined);
                  reference.current = null;
                  update({ sensorFollow: value });
                }}
              />
              <SwitchRow label="Odbicie lustrzane" value={mirror} onValueChange={toggleMirror} />
              <SwitchRow
                label="Siatka pomocnicza"
                value={settings.grid}
                onValueChange={(value) => update({ grid: value })}
              />
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setControlsOpen(true)}
            style={styles.trayCollapsed}>
            <Ionicons name="options-outline" size={18} color="#FFFFFF" />
            <Text style={styles.trayCollapsedText}>Sterowanie</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#05070C' },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: '#080C14',
  },
  fallbackTitle: { color: '#F2F4F8', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  fallbackText: { color: 'rgba(242,244,248,0.65)', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  fallbackAction: { marginTop: spacing.sm, minWidth: 220 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  topInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,10,18,0.55)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(6,10,18,0.55)',
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: projectionColors.cyan },
  badgeText: { color: '#E6F6FF', fontSize: 11, fontWeight: '600' },
  helpPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(6,10,18,0.6)',
  },
  helpText: { color: '#E6F6FF', fontSize: 12 },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  trayPanel: {
    backgroundColor: 'rgba(6,10,18,0.92)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  trayHandleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trayTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  toggles: { marginTop: spacing.xs, gap: spacing.sm },
  trayCollapsed: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(6,10,18,0.7)',
  },
  trayCollapsedText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
