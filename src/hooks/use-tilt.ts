import { Accelerometer, Magnetometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { headingFromMagnetometer, smooth, tiltFromGravity } from '@/lib/projection';

export type TiltState = {
  /** Nodding angle of the phone, degrees. */
  pitch: number;
  /** Left/right tilt of the phone, degrees. */
  roll: number;
  /** Approximate compass heading, degrees 0–360 (null when there is no magnetometer). */
  heading: number | null;
  /** True once at least one accelerometer reading has arrived. */
  available: boolean;
};

const INITIAL: TiltState = { pitch: 0, roll: 0, heading: null, available: false };

/**
 * Tilt of the phone from its accelerometer (gravity) and, when present, an approximate
 * heading from the magnetometer. This is the substitute for ARCore's pose tracking: it
 * tells the projection layer how the phone moved, without any depth or plane detection.
 *
 * `smoothing` 0–0.9 damps sensor noise; `enabled` unsubscribes completely when false.
 */
export function useTilt(smoothing: number, enabled: boolean): TiltState {
  const [state, setState] = useState<TiltState>(INITIAL);
  const values = useRef<TiltState>(INITIAL);
  const lastMagnet = useRef<{ x: number; y: number; z: number } | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let alive = true;
    values.current = INITIAL;
    Accelerometer.setUpdateInterval(80);
    const accel = Accelerometer.addListener(({ x, y, z }) => {
      if (!alive) return;
      const tilt = tiltFromGravity(x, y, z);
      const prev = values.current;
      const nextPitch = prev.available ? smooth(prev.pitch, tilt.pitch, smoothing) : tilt.pitch;
      const nextRoll = prev.available ? smooth(prev.roll, tilt.roll, smoothing) : tilt.roll;
      const magnet = lastMagnet.current;
      const heading = magnet
        ? headingFromMagnetometer(magnet.x, magnet.y, magnet.z, nextPitch, nextRoll)
        : prev.heading;
      const next: TiltState = {
        pitch: nextPitch,
        roll: nextRoll,
        heading: heading === null ? null : (heading + 360) % 360,
        available: true,
      };
      values.current = next;
      setState(next);
    });

    let magnet: { remove: () => void } | null = null;
    Magnetometer.isAvailableAsync()
      .then((ok) => {
        if (!ok || !alive) return;
        Magnetometer.setUpdateInterval(120);
        magnet = Magnetometer.addListener(({ x, y, z }) => {
          lastMagnet.current = { x, y, z };
        });
      })
      .catch(() => {
        // No magnetometer: tilt still works, heading stays null.
      });

    return () => {
      alive = false;
      accel.remove();
      magnet?.remove();
    };
  }, [enabled, smoothing]);

  return state;
}
