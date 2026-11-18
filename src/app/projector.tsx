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
import { SurfacePicker } from '@/components/projection/surface-picker';
import { Button } from '@/components/ui';
import { projectionColors, spacing } from '@/constants/theme';
import { useDevicePose } from '@/hooks/use-device-pose';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { useScreens } from '@/hooks/use-screens';
import { DEFAULT_PROJECTION, DEMO_CONTENT } from '@/lib/defaults';
import {
  apply,
  cameraAxes,
  denormalizeQuad,
  isUsableQuad,
  matrix4FromQuad,
  multiply,
  previewIntrinsics,
  rotationFromEuler,
  rotationHomography,
  scaleQuad,
  transpose,
  type Point,
} from '@/lib/homography';
import { boardSize, trackingLabel } from '@/lib/projection';
import type { ProjectionSettings, SurfaceAnchor } from '@/lib/types';

type Stage = { width: number; height: number };

/** A sensible starting quad: the middle of the frame, inset from the edges. */
function defaultQuad(): Point[] {
  return [
    { x: 0.16, y: 0.3 },
    { x: 0.84, y: 0.3 },
    { x: 0.84, y: 0.7 },
    { x: 0.16, y: 0.7 },
  ];
}

/**
 * The projection itself.
 *
 * The camera feed is the background (no ARCore involved). The user marks a flat surface
 * with four corners; from then on the image is warped onto that quad by a real planar
 * homography, so it lies on the table or wall in perspective instead of floating as a
 * rectangle. The phone's rotation vector keeps the quad glued to the surface while the
 * phone turns: H = K · R · K⁻¹, the exact homography a pure rotation induces.
 */
export default function ProjectorScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [settings, setSettings] = usePersistentState<ProjectionSettings>(
    'projection-settings',
    DEFAULT_PROJECTION,
  );
  const [anchor, setAnchor] = usePersistentState<SurfaceAnchor | null>('surface-anchor', null);
  const { active, update: updateScreen } = useScreens();

  const [stage, setStage] = useState<Stage>({ width: 0, height: 0 });
  const [marking, setMarking] = useState(false);
  const [draft, setDraft] = useState<Point[]>(defaultQuad);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [helpVisible, setHelpVisible] = useState(true);

  const pose = useDevicePose(settings.tracking, settings.smoothing);

  const content = active ?? DEMO_CONTENT;
  const mirror = active ? active.mirror : settings.mirror;

  const board = useMemo(() => boardSize(stage.width), [stage.width]);
  const showPicker = marking || !anchor;

  // Enter marking mode with the current quad, so re-marking starts from what is on screen.
  useEffect(() => {
    if (marking) setDraft(anchor ? anchor.quad : defaultQuad());
  }, [marking, anchor]);

  /**
   * The quad in stage pixels, after tracking and the size slider.
   *
   * Tracking: the rotation between the moment the surface was marked and now is turned
   * into a homography, which moves the four corners exactly as the real surface moves in
   * the camera image. Without a rotation sensor the quad simply stays where it was put.
   */
  const quad = useMemo<Point[] | null>(() => {
    if (!anchor || stage.width <= 0 || stage.height <= 0) return null;
    const base = denormalizeQuad(anchor.quad, stage.width, stage.height);
    let moved = base;

    if (settings.tracking && pose.available) {
      const k = previewIntrinsics(anchor.fov, stage.width, stage.height);
      const sign = settings.invertRotation ? -1 : 1;
      const reference = cameraAxes(
        rotationFromEuler(
          sign * anchor.reference.alpha,
          sign * anchor.reference.beta,
          sign * anchor.reference.gamma,
        ),
      );
      const current = cameraAxes(
        rotationFromEuler(sign * pose.alpha, sign * pose.beta, sign * pose.gamma),
      );
      const delta = multiply(current, transpose(reference));
      const h = rotationHomography(k, delta);
      if (h) moved = base.map((point) => apply(h, point));
    }

    const scaled = scaleQuad(moved, settings.size);
    return isUsableQuad(scaled) ? scaled : null;
  }, [
    anchor,
    stage.width,
    stage.height,
    settings.tracking,
    settings.invertRotation,
    settings.size,
    pose,
  ]);

  const matrix = useMemo(
    () => (quad ? matrix4FromQuad(quad, board.width, board.height) : null),
    [quad, board.width, board.height],
  );

  /**
   * What the image is warped onto right now.
   *
   * While the surface is being marked the draft quad is used, so the image is already
   * visible and follows the corners as they are dragged — the user sees the result before
   * confirming, instead of staring at an empty camera image.
   */
  const liveMatrix = useMemo(() => {
    if (showPicker) {
      if (stage.width <= 0 || stage.height <= 0) return null;
      const draftPx = denormalizeQuad(draft, stage.width, stage.height);
      const scaled = scaleQuad(draftPx, settings.size);
      return isUsableQuad(scaled) ? matrix4FromQuad(scaled, board.width, board.height) : null;
    }
    return matrix;
  }, [
    showPicker,
    draft,
    stage.width,
    stage.height,
    settings.size,
    board.width,
    board.height,
    matrix,
  ]);

  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage({ width, height });
  };

  const update = useCallback(
    (patch: Partial<ProjectionSettings>) => setSettings((prev) => ({ ...prev, ...patch })),
    [setSettings],
  );

  const confirmSurface = () => {
    if (!isUsableQuad(draft)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setAnchor({
      quad: draft,
      reference: { alpha: pose.alpha, beta: pose.beta, gamma: pose.gamma },
      fov: settings.fov,
      createdAt: Date.now(),
    });
    setMarking(false);
    setHelpVisible(false);
  };

  const clearSurface = () => {
    setAnchor(null);
    setMarking(true);
  };

  // Dragging in projection mode slides the whole image across the surface.
  const dragStart = useRef<Point[] | null>(null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !showPicker,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          !showPicker && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
        onPanResponderGrant: () => {
          dragStart.current = anchor ? anchor.quad : null;
          setHelpVisible(false);
        },
        onPanResponderMove: (_event, gesture) => {
          const start = dragStart.current;
          if (!start || stage.width <= 0 || stage.height <= 0) return;
          const dx = gesture.dx / stage.width;
          const dy = gesture.dy / stage.height;
          setAnchor({
            ...(anchor as SurfaceAnchor),
            quad: start.map((point) => ({ x: point.x + dx, y: point.y + dy })),
          });
        },
        onPanResponderRelease: () => {
          dragStart.current = null;
        },
      }),
    [showPicker, anchor, stage.width, stage.height, setAnchor],
  );

  const toggleMirror = () => {
    if (active) {
      updateScreen(active.id, { mirror: !active.mirror });
      return;
    }
    update({ mirror: !settings.mirror });
  };

  const cameraReady = Platform.OS !== 'web' && permission?.granted === true;
  const tracking = trackingLabel(settings, pose.available);

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
                title={
                  permission?.canAskAgain === false ? 'Otwórz ustawienia' : 'Zezwól na aparat'
                }
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

      <View
        style={StyleSheet.absoluteFill}
        onLayout={onStageLayout}
        {...(showPicker ? {} : panResponder.panHandlers)}>
        {settings.grid ? <AlignmentGrid /> : null}

        {liveMatrix && board.width > 0 ? (
          <ProjectedScreen
            content={{ ...content, mirror }}
            width={board.width}
            height={board.height}
            opacity={settings.opacity}
            matrix={liveMatrix}
          />
        ) : null}

        {showPicker && stage.width > 0 ? (
          <SurfacePicker quad={draft} onChange={setDraft} stage={stage} />
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
          <View style={styles.badge}>
            <View style={[styles.dot, !anchor && styles.dotIdle]} />
            <Text style={styles.badgeText}>
              {showPicker
                ? 'Zaznacz powierzchnię'
                : anchor && settings.tracking
                  ? 'Zakotwiczone'
                  : 'Powierzchnia'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showPicker ? 'Zatwierdź powierzchnię' : 'Zaznacz powierzchnię ponownie'
            }
            onPress={() => (showPicker ? confirmSurface() : setMarking(true))}
            hitSlop={8}
            style={styles.iconButton}>
            <Ionicons name={showPicker ? 'checkmark' : 'scan-outline'} size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {settings.diagnostics && !showPicker ? (
        <ProjectionHud
          settings={settings}
          content={content}
          anchored={!!anchor}
          pose={pose}
          tracking={tracking}
        />
      ) : null}

      {helpVisible ? (
        <View pointerEvents="none" style={styles.helpPill}>
          <Ionicons
            name={showPicker ? 'move-outline' : 'hand-left-outline'}
            size={14}
            color="#E6F6FF"
          />
          <Text style={styles.helpText}>
            {showPicker
              ? 'Przeciągnij narożniki 1–4 na rogi powierzchni'
              : 'Przeciągnij, aby przesunąć obraz po powierzchni'}
          </Text>
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

            {showPicker ? (
              <>
                <Text style={styles.trayHint}>
                  Zaznacz cztery rogi płaskiej powierzchni — stołu, podłogi albo ściany. Obraz
                  będzie na niej leżał w perspektywie.
                </Text>
                <Button title="Zatwierdź powierzchnię" icon="checkmark" onPress={confirmSurface} />
                {anchor ? (
                  <Button
                    title="Anuluj zaznaczanie"
                    variant="secondary"
                    icon="close"
                    onPress={() => setMarking(false)}
                  />
                ) : null}
              </>
            ) : (
              <>
                <SliderRow
                  label="Rozmiar obrazu"
                  value={settings.size}
                  minimumValue={0.3}
                  maximumValue={2}
                  step={0.05}
                  format={(v) => `${v.toFixed(2)}×`}
                  onValueChange={(v) => update({ size: v })}
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
                    label="Śledzenie powierzchni"
                    description="Obraz zostaje na stole, gdy obracasz telefon"
                    value={settings.tracking}
                    onValueChange={(value) => {
                      Haptics.selectionAsync().catch(() => undefined);
                      update({ tracking: value });
                    }}
                  />
                  <SwitchRow label="Odbicie lustrzane" value={mirror} onValueChange={toggleMirror} />
                  <SwitchRow
                    label="Siatka pomocnicza"
                    value={settings.grid}
                    onValueChange={(value) => update({ grid: value })}
                  />
                  <SwitchRow
                    label="Odczyt techniczny"
                    value={settings.diagnostics}
                    onValueChange={(value) => update({ diagnostics: value })}
                  />
                </View>
                <View style={styles.trayActions}>
                  <View style={styles.trayAction}>
                    <Button
                      title="Zaznacz ponownie"
                      variant="secondary"
                      icon="scan-outline"
                      onPress={() => setMarking(true)}
                    />
                  </View>
                  <View style={styles.trayAction}>
                    <Button
                      title="Wyczyść"
                      variant="ghost"
                      icon="trash-outline"
                      onPress={clearSurface}
                    />
                  </View>
                </View>
              </>
            )}
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
  fallbackText: {
    color: 'rgba(242,244,248,0.65)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
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
  dotIdle: { backgroundColor: 'rgba(255,255,255,0.45)' },
  badgeText: { color: '#E6F6FF', fontSize: 11, fontWeight: '600' },
  helpPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '46%',
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
  trayHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 17 },
  toggles: { marginTop: spacing.xs, gap: spacing.sm },
  trayActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  trayAction: { flex: 1 },
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
