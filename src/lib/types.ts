import type { Point } from './homography';

/** One item you can show on the virtual screen. */
export type ScreenKind = 'text' | 'color' | 'image';

export type ScreenContent = {
  id: string;
  title: string;
  kind: ScreenKind;
  /** Body text for kind 'text'. */
  text: string;
  /** Background color for every kind. */
  color: string;
  /** Local file URI (documentDirectory) for kind 'image'. */
  imageUri: string | null;
  /** Mirrored content, for projecting onto a wall the phone does not see. */
  mirror: boolean;
  createdAt: number;
};

/** What the projector draws. Demo content is used when the user has no screens yet. */
export type ProjectionContent = Pick<
  ScreenContent,
  'title' | 'kind' | 'text' | 'color' | 'imageUri' | 'mirror'
>;

/**
 * A flat surface the user has marked with four corners. The quad is stored as fractions
 * of the camera stage, so it survives a change of screen size or orientation.
 */
export type SurfaceAnchor = {
  /** Corners in TL, TR, BR, BL order, each coordinate 0–1 of the stage. */
  quad: Point[];
  /** Device orientation (radians) at the moment the surface was marked. */
  reference: { alpha: number; beta: number; gamma: number };
  /** Camera vertical field of view used for the intrinsics, degrees. */
  fov: number;
  createdAt: number;
};

export type ProjectionSettings = {
  /** Relative size of the projected image, 0.4 – 2. */
  size: number;
  /** Opacity of the projected image, 0.2 – 1. */
  opacity: number;
  /** Alignment grid over the camera image. */
  grid: boolean;
  /** Mirror the projected image horizontally. */
  mirror: boolean;
  /** Keep the image glued to the surface while the phone turns. */
  tracking: boolean;
  /** Flip the tracking direction if the image slides the wrong way on your phone. */
  invertRotation: boolean;
  /** Sensor smoothing, 0 = raw, 0.9 = very smooth. */
  smoothing: number;
  /** Assumed vertical field of view of the camera in degrees, 40 – 75. */
  fov: number;
  /** Show the technical readout over the projection. */
  diagnostics: boolean;
};
