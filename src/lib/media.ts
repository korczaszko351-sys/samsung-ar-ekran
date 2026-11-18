import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Screen images are copied out of the picker's cache into the app's documents folder:
 * the picker cache is cleaned by the system, so a URI kept from there becomes a broken
 * image after a few days.
 */
const FOLDER = 'screens';

function screensDir(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0];
  const match = /\.([A-Za-z0-9]{2,4})$/.exec(clean);
  return match ? match[1].toLowerCase() : 'jpg';
}

/** Returns a durable URI for the picked image. On the web the original URI is kept. */
export async function importImage(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const dir = screensDir();
  const target = new File(dir, `img-${Date.now()}.${extensionOf(sourceUri)}`);
  const source = new File(sourceUri);
  await source.copy(target);
  return target.uri;
}

/** Deletes a previously imported image. Never throws: a missing file is not an error. */
export async function deleteImage(uri: string | null): Promise<void> {
  if (!uri || Platform.OS === 'web') return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The file was already gone; nothing to clean up.
  }
}
