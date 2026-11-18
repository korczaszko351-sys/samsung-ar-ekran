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

export type ProjectionSettings = {
  /** Relative size of the virtual screen, 0.4 – 2. */
  size: number;
  /** Assumed distance to the surface in meters, 0.5 – 10. */
  distance: number;
  /** Opacity of the projected image, 0.2 – 1. */
  opacity: number;
  /** Alignment grid over the camera image. */
  grid: boolean;
  /** Mirror the projected image horizontally. */
  mirror: boolean;
  /** Keep the screen anchored in the world while the phone moves. */
  sensorFollow: boolean;
  /** Sensor smoothing, 0 = raw, 0.9 = very smooth. */
  smoothing: number;
  /** Assumed vertical field of view of the camera in degrees, 40 – 75. */
  fov: number;
  /** Flip the tilt direction if the screen drifts the wrong way on your phone. */
  invertTilt: boolean;
};
