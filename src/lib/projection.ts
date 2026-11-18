import type { ProjectionSettings } from './types';

/** Height of the virtual screen in meters at size = 1 (a 16:9 board, roughly 2.1 m wide). */
export const BASE_SCREEN_HEIGHT_M = 1.2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * How much of the camera image's height the virtual screen covers, from the assumed
 * distance, the camera field of view and the chosen size. This is ordinary perspective
 * projection maths — no depth sensor and no ARCore involved.
 */
export function projectedScale(settings: ProjectionSettings): number {
  const fovRad = (settings.fov * Math.PI) / 180;
  const screenWorldM = BASE_SCREEN_HEIGHT_M * settings.size;
  // Visible height of the scene at that distance: 2 * d * tan(fov / 2).
  const visibleWorldM = 2 * settings.distance * Math.tan(fovRad / 2);
  if (!(visibleWorldM > 0)) return 1;
  return clamp(screenWorldM / visibleWorldM, 0.12, 1.9);
}

/** Distance in meters implied by the current scale — shown as a readout. */
export function effectiveDistance(settings: ProjectionSettings): number {
  const fovRad = (settings.fov * Math.PI) / 180;
  const screenWorldM = BASE_SCREEN_HEIGHT_M * settings.size;
  const scale = projectedScale(settings);
  return screenWorldM / (2 * Math.tan(fovRad / 2) * scale);
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
 * Compass heading from raw magnetometer values, compensated for the phone's tilt.
 * Approximate by nature: without ARCore there is no calibration against the camera.
 */
export function headingFromMagnetometer(
  mx: number,
  my: number,
  mz: number,
  pitchDeg: number,
  rollDeg: number,
): number {
  const p = (pitchDeg * Math.PI) / 180;
  const r = (rollDeg * Math.PI) / 180;
  const xh = mx * Math.cos(p) + mz * Math.sin(p);
  const yh =
    mx * Math.sin(r) * Math.sin(p) + my * Math.cos(r) - mz * Math.sin(r) * Math.cos(p);
  if (xh === 0 && yh === 0) return 0;
  return (Math.atan2(-yh, xh) * 180) / Math.PI;
}

/**
 * Tilt of the phone from the accelerometer's gravity reaction, in degrees.
 *
 * Device frame: X right, Y up along the screen, Z out of the screen.
 * - `pitch` 0 when the phone stands upright (looking at the wall), +90 when it lies flat
 *   and looks at the floor.
 * - `roll` 0 when upright, positive when the phone is tilted to the right.
 */
export function tiltFromGravity(ax: number, ay: number, az: number): { pitch: number; roll: number } {
  const pitch = (Math.atan2(az, ay) * 180) / Math.PI;
  const roll = (Math.atan2(ax, ay) * 180) / Math.PI;
  return {
    pitch: Number.isFinite(pitch) ? pitch : 0,
    roll: Number.isFinite(roll) ? roll : 0,
  };
}
