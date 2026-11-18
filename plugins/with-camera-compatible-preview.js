/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Makes the expo-camera preview a TextureView instead of a SurfaceView.
 *
 * Why: CameraX's PreviewView defaults to ImplementationMode.PERFORMANCE, which renders
 * the camera into a separate SurfaceView layer. On several Samsung devices that layer is
 * composited above the React Native view hierarchy, so anything drawn on top of
 * <CameraView> — the whole projection — is simply not visible. COMPATIBLE mode renders
 * into a TextureView inside the normal view tree, so the overlay composites correctly.
 *
 * The patch is applied to node_modules during `expo prebuild`, before Gradle compiles, and
 * writes a report to android/camera-preview-patch.txt so the build log shows what
 * happened. If expo-camera changes its source, the report says so instead of failing the
 * build silently.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const TARGET = path.join(
  'node_modules',
  'expo-camera',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'camera',
  'ExpoCameraView.kt',
);

const NEEDLE = '  private var previewView = PreviewView(context).apply {\n    elevation = 0f\n  }';

const REPLACEMENT = [
  '  private var previewView = PreviewView(context).apply {',
  '    elevation = 0f',
  '    // Patched by plugins/with-camera-compatible-preview.js: TextureView instead of',
  '    // SurfaceView, so React Native views drawn on top of the camera stay visible.',
  '    implementationMode = PreviewView.ImplementationMode.COMPATIBLE',
  '  }',
].join('\n');

function patchFile(projectRoot) {
  const file = path.join(projectRoot, TARGET);
  if (!fs.existsSync(file)) {
    return `expo-camera source not found at ${TARGET} — preview left in PERFORMANCE mode`;
  }
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('ImplementationMode.COMPATIBLE')) {
    return 'already patched: preview uses ImplementationMode.COMPATIBLE';
  }
  if (!source.includes(NEEDLE)) {
    return 'pattern not found in ExpoCameraView.kt — preview left in PERFORMANCE mode';
  }
  fs.writeFileSync(file, source.replace(NEEDLE, REPLACEMENT), 'utf8');
  return 'patched: preview uses ImplementationMode.COMPATIBLE (TextureView)';
}

module.exports = function withCameraCompatiblePreview(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const result = patchFile(projectRoot);
      try {
        fs.mkdirSync(androidRoot, { recursive: true });
        fs.writeFileSync(path.join(androidRoot, 'camera-preview-patch.txt'), `${result}\n`, 'utf8');
      } catch {
        // The report is a convenience; the patch itself already happened.
      }
      console.log(`[with-camera-compatible-preview] ${result}`);
      return modConfig;
    },
  ]);
};
