import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { wrapAngle } from '@/lib/projection';

export type DevicePose = {
  /** Rotation about the vertical axis, radians. */
  alpha: number;
  /** Nodding angle, radians. */
  beta: number;
  /** Left/right tilt, radians. */
  gamma: number;
  /** Same angles in degrees, for the readout. */
  pitchDeg: number;
  rollDeg: number;
  /** True once at least one reading has arrived. */
  available: boolean;
};

const INITIAL: DevicePose = {
  alpha: 0,
  beta: 0,
  gamma: 0,
  pitchDeg: 0,
  rollDeg: 0,
  available: false,
};

/** Smooth an angle across the ±180° seam instead of through it. */
function smoothAngle(previous: number, next: number, amount: number): number {
  const delta = wrapAngle(((next - previous) * 180) / Math.PI);
  return previous + (delta * Math.PI) / 180 * (1 - Math.min(0.95, Math.max(0, amount)));
}

/**
 * The phone's orientation in space, from the rotation vector sensor (accelerometer +
 * gyroscope + magnetometer fused by Android).
 *
 * This is the substitute for ARCore's pose tracking: it is what lets the projection stay
 * glued to a surface while the phone turns, without any depth sensor or Google service.
 * `enabled` unsubscribes completely when false, so the sensor costs nothing when the
 * projection is not running.
 */
export function useDevicePose(enabled: boolean, smoothing: number): DevicePose {
  const [pose, setPose] = useState<DevicePose>(INITIAL);
  const latest = useRef<DevicePose>(INITIAL);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let alive = true;
    let subscription: { remove: () => void } | null = null;
    latest.current = INITIAL;

    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!available || !alive) return;
        DeviceMotion.setUpdateInterval(50);
        subscription = DeviceMotion.addListener((measurement: DeviceMotionMeasurement) => {
          const rotation = measurement.rotation;
          if (!rotation) return;
          const previous = latest.current;
          const next: DevicePose = previous.available
            ? {
                alpha: smoothAngle(previous.alpha, rotation.alpha, smoothing),
                beta: smoothAngle(previous.beta, rotation.beta, smoothing),
                gamma: smoothAngle(previous.gamma, rotation.gamma, smoothing),
                pitchDeg: (rotation.beta * 180) / Math.PI,
                rollDeg: (rotation.gamma * 180) / Math.PI,
                available: true,
              }
            : {
                alpha: rotation.alpha,
                beta: rotation.beta,
                gamma: rotation.gamma,
                pitchDeg: (rotation.beta * 180) / Math.PI,
                rollDeg: (rotation.gamma * 180) / Math.PI,
                available: true,
              };
          latest.current = next;
          setPose(next);
        });
      })
      .catch(() => {
        // No rotation vector on this device: the projection stays static, which the HUD
        // reports instead of failing silently.
      });

    return () => {
      alive = false;
      subscription?.remove();
    };
  }, [enabled, smoothing]);

  return pose;
}
