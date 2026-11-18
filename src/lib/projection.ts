import type { ProjectionSettings } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Smooth a stream of sensor values without lagging behind a still phone. */
export function smooth(previous: number, next: number, amount: number): number {
  const a = clamp(amount, 0, 0.95);
  return previous + (next - previous) * (1 - a);
}

/** Wrap an angle into −180…180. */
export function wrapAngle(deg: number): number {
  let value = deg % 360;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return value;
}

/**
 * Aspect ratio of the projected image. 16:9 matches a presentation slide, which is what a
 * teacher projects most often; the surface quad decides how big it ends up on the table.
 */
export const BOARD_ASPECT = 9 / 16;

/** Size of the view that carries the image, before the homography warps it. */
export function boardSize(stageWidth: number): { width: number; height: number } {
  const width = Math.max(1, stageWidth);
  return { width, height: width * BOARD_ASPECT };
}

/** Human-readable summary of the current projection mode, used by the HUD. */
export function trackingLabel(settings: ProjectionSettings, poseAvailable: boolean): string {
  if (!settings.tracking) return 'wyłączone';
  if (!poseAvailable) return 'brak czujnika obrotu';
  return 'aktywne';
}
