/**
 * Planar homography maths for the surface projection.
 *
 * The whole point of this module: a flat surface seen by a camera is described by a
 * homography (a 3x3 projective transform), not by a rectangle with a rotation. Once the
 * four corners of the surface are known, the image can be warped so that it *lies* on
 * that surface in perspective, and it can be kept there while the phone turns.
 *
 * Everything here is plain arithmetic on numbers — no ARCore, no depth sensor, no native
 * code. Matrices are 3x3 row-major arrays of nine numbers.
 */

export type Point = { x: number; y: number };

/** 3x3 matrix, row-major: [m00, m01, m02, m10, m11, m12, m20, m21, m22]. */
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** a · b (row-major, so the result applies b first, then a). */
export function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9) as Mat3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

export function transpose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

/** Inverse of a 3x3 matrix, or null when it is singular. */
export function invert(m: Mat3): Mat3 | null {
  const a = m[0];
  const b = m[1];
  const c = m[2];
  const d = m[3];
  const e = m[4];
  const f = m[5];
  const g = m[6];
  const h = m[7];
  const i = m[8];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    (e * i - f * h) * inv,
    (c * h - b * i) * inv,
    (b * f - c * e) * inv,
    (f * g - d * i) * inv,
    (a * i - c * g) * inv,
    (c * d - a * f) * inv,
    (d * h - e * g) * inv,
    (b * g - a * h) * inv,
    (a * e - b * d) * inv,
  ];
}

/** Apply a homography to a point (projective division included). */
export function apply(m: Mat3, p: Point): Point {
  const w = m[6] * p.x + m[7] * p.y + m[8];
  const safe = Math.abs(w) < 1e-9 ? 1e-9 : w;
  return {
    x: (m[0] * p.x + m[1] * p.y + m[2]) / safe,
    y: (m[3] * p.x + m[4] * p.y + m[5]) / safe,
  };
}

/** Gauss-Jordan with partial pivoting. Returns null for a singular system. */
function solveLinear(rows: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const m = rows.map((row, index) => [...row, rhs[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < 1e-12) return null;
    if (pivot !== col) {
      const swap = m[pivot];
      m[pivot] = m[col];
      m[col] = swap;
    }
    const lead = m[col][col];
    for (let c = col; c <= n; c += 1) m[col][c] /= lead;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = m[r][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c += 1) m[r][c] -= factor * m[col][c];
    }
  }
  return m.map((row) => row[n]);
}

/**
 * The homography that maps four source points onto four destination points (DLT with
 * h33 fixed to 1). Returns null when the points are degenerate — three corners on one
 * line, or two corners on top of each other.
 */
export function solveHomography(src: Point[], dst: Point[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  const rows: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    rows.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    rhs.push(u);
    rows.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    rhs.push(v);
  }
  const h = solveLinear(rows, rhs);
  if (!h || !h.every((value) => Number.isFinite(value))) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

/** Corners of a width x height rectangle after a homography: TL, TR, BR, BL. */
export function quadFromRect(h: Mat3, width: number, height: number): Point[] {
  return [
    apply(h, { x: 0, y: 0 }),
    apply(h, { x: width, y: 0 }),
    apply(h, { x: width, y: height }),
    apply(h, { x: 0, y: height }),
  ];
}

/**
 * A React Native `transform: [{ matrix }]` value that warps a width x height view onto
 * the given quad.
 *
 * React Native applies transforms about the view's centre, so the homography is
 * conjugated by the centre offset first. The 3x3 is then embedded in a 4x4 whose fourth
 * column carries the projective terms — the layout React Native's Android renderer
 * decomposes into translate / scale / rotate / camera distance.
 */
export function matrix4FromQuad(quad: Point[], width: number, height: number): number[] | null {
  if (!(width > 0) || !(height > 0)) return null;
  const rect: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const h = solveHomography(rect, quad);
  if (!h) return null;

  // React Native applies a transform about the view's centre C, i.e. p ↦ C + M(p − C).
  // We need that to equal H(p), so with q = p − C:
  //   M(q) = H(q + C) − C = [ (A − C·cᵀ)q + (A·C + t − C·s) ] / (c·q + s),  s = c·C + d.
  // Both the linear part and the translation therefore need the centre correction — leaving
  // the linear part alone makes the image drift and shear instead of landing on the quad.
  const cx = width / 2;
  const cy = height / 2;
  const s = h[6] * cx + h[7] * cy + h[8];
  if (!Number.isFinite(s) || Math.abs(s) < 1e-9) return null;

  const m00 = h[0] - cx * h[6];
  const m01 = h[1] - cx * h[7];
  const m10 = h[3] - cy * h[6];
  const m11 = h[4] - cy * h[7];
  const tx = h[0] * cx + h[1] * cy + h[2] - cx * s;
  const ty = h[3] * cx + h[4] * cy + h[5] - cy * s;

  const values = [m00, m01, tx, m10, m11, ty, h[6], h[7], s];
  if (!values.every((value) => Number.isFinite(value))) return null;

  // Column-major 4x4 (CSS matrix3d layout), which is what React Native's `matrix`
  // transform expects: the projective row sits at indices 3, 7, 11, 15.
  return [m00, m10, 0, h[6], m01, m11, 0, h[7], 0, 0, 1, 0, tx, ty, 0, s];
}

/**
 * Camera intrinsics from a vertical field of view. The focal length is expressed in the
 * same pixels as the stage, which is what the homography needs.
 */
export function cameraIntrinsics(fovDeg: number, width: number, height: number): Mat3 {
  const f = height / 2 / Math.tan((fovDeg * Math.PI) / 360);
  return [f, 0, width / 2, 0, f, height / 2, 0, 0, 1];
}

/**
 * Intrinsics for the *preview as it is displayed*, not for the raw sensor image.
 *
 * The camera preview fills the stage by cropping (CameraX FILL_CENTER), so the visible
 * field of view is narrower than the sensor's whenever the stage is not the same shape as
 * the camera image. Using the stage height directly as if it were the sensor height makes
 * the focal length too short, and the image then slides too far for a given turn — the
 * "it runs away" symptom. This scales the focal length by the same factor the preview is
 * scaled by, assuming the usual 4:3 back camera.
 */
export function previewIntrinsics(
  fovDeg: number,
  stageWidth: number,
  stageHeight: number,
  sensorAspect = 4 / 3,
): Mat3 {
  if (!(stageWidth > 0) || !(stageHeight > 0)) {
    return cameraIntrinsics(fovDeg, Math.max(1, stageWidth), Math.max(1, stageHeight));
  }
  // Sensor image in arbitrary units, with the given vertical field of view.
  const sensorHeight = 1;
  const sensorWidth = sensorAspect;
  const focal = sensorHeight / 2 / Math.tan((fovDeg * Math.PI) / 360);
  // FILL_CENTER: scale so the image covers the stage, then crop the overflow.
  const scale = Math.max(stageWidth / sensorWidth, stageHeight / sensorHeight);
  const f = focal * scale;
  return [f, 0, stageWidth / 2, 0, f, stageHeight / 2, 0, 0, 1];
}

/**
 * Rotation matrix from the three angles expo-sensors reports, in radians.
 *
 * expo-sensors maps the Android rotation vector to: alpha = rotation about Z (the axis out
 * of the screen), beta = about X (the short edge — nodding the phone up and down), gamma =
 * about Y (the long edge — turning the phone left and right). The matrix is therefore
 * Rz(alpha) · Rx(beta) · Ry(gamma), which is what makes a nod move the image vertically and
 * a turn move it horizontally.
 */
export function rotationFromEuler(alpha: number, beta: number, gamma: number): Mat3 {
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  const cb = Math.cos(beta);
  const sb = Math.sin(beta);
  const cg = Math.cos(gamma);
  const sg = Math.sin(gamma);
  // Rz(alpha) · Rx(beta) · Ry(gamma), multiplied out.
  return [
    ca * cg - sa * sb * sg,
    -sa * cb,
    ca * sg + sa * sb * cg,
    sa * cg + ca * sb * sg,
    ca * cb,
    sa * sg - ca * sb * cg,
    -cb * sg,
    sb,
    cb * cg,
  ];
}

/**
 * Re-express a rotation from the device frame (X right, Y up, Z out of the screen) in the
 * camera frame (X right, Y down, Z into the scene). The change of basis is
 * diag(1, -1, -1), so it only flips the signs of the terms that mix Y or Z.
 */
export function cameraAxes(r: Mat3): Mat3 {
  const s = [1, -1, -1];
  const out = new Array(9) as Mat3;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) out[i * 3 + j] = s[i] * s[j] * r[i * 3 + j];
  }
  return out;
}

/**
 * The homography a pure rotation induces between two views of the same plane:
 * H = K · R · K⁻¹. Exact for rotation, a good approximation for the small translations
 * of a phone held in the hand.
 */
export function rotationHomography(k: Mat3, r: Mat3): Mat3 | null {
  const kInv = invert(k);
  if (!kInv) return null;
  return multiply(multiply(k, r), kInv);
}

export function centroid(quad: Point[]): Point {
  const sum = quad.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / quad.length, y: sum.y / quad.length };
}

/** Grow or shrink a quad about its own centre. */
export function scaleQuad(quad: Point[], factor: number): Point[] {
  const c = centroid(quad);
  return quad.map((p) => ({ x: c.x + (p.x - c.x) * factor, y: c.y + (p.y - c.y) * factor }));
}

/** Store a quad as fractions of the stage, so it survives a change of screen size. */
export function normalizeQuad(quad: Point[], width: number, height: number): Point[] {
  if (!(width > 0) || !(height > 0)) return quad;
  return quad.map((p) => ({ x: p.x / width, y: p.y / height }));
}

export function denormalizeQuad(quad: Point[], width: number, height: number): Point[] {
  return quad.map((p) => ({ x: p.x * width, y: p.y * height }));
}

/** True when the four points form a non-degenerate, convex quad in TL, TR, BR, BL order. */
export function isUsableQuad(quad: Point[]): boolean {
  if (quad.length !== 4) return false;
  if (!quad.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return false;
  let sign = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % 4];
    const c = quad[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    const current = Math.sign(cross);
    if (sign === 0) sign = current;
    else if (current !== sign) return false;
  }
  return true;
}
