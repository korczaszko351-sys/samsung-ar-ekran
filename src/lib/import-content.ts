import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { importImage } from '@/lib/media';
import type { ScreenContent } from '@/lib/types';

/**
 * Bringing content in from other apps.
 *
 * Android does not let one app read another app's screen without the MediaProjection
 * permission, which needs native code (see docs/OTHER_APPS.md). What *is* possible from
 * plain JavaScript is the other half of the same job: taking content that another app
 * produced and putting it on the projected surface.
 *
 * Two routes, both through the system:
 *  - the document picker, which reaches every file provider on the phone (Files, Downloads,
 *    Drive, Gmail attachments, a photo editor's export) and hands back a copy;
 *  - the clipboard, for text copied in any other app.
 */

export type ImportResult =
  | { status: 'cancelled' }
  | { status: 'ok'; screen: ScreenContent }
  | { status: 'error'; message: string };

function newId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Trim a long text to something that fits a projected board. */
function previewOf(text: string, limit = 600): string {
  const clean = text.replace(/\r\n/g, '\n').trim();
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

/** First line of a text, used as the board title. */
function titleOf(text: string, fallback: string): string {
  const first = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!first) return fallback;
  return first.length > 48 ? `${first.slice(0, 48).trimEnd()}…` : first;
}

/**
 * Pick an image from any app on the phone and turn it into a board.
 *
 * The picker returns a cache URI, which the system may clear, so the file is copied into
 * the app's documents folder before it is stored on the board.
 */
export async function importImageFromApp(): Promise<ImportResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) return { status: 'cancelled' };

    const asset = result.assets[0];
    const uri = await importImage(asset.uri);
    const name = asset.name?.replace(/\.[^.]+$/, '') ?? 'Obraz z innej aplikacji';

    return {
      status: 'ok',
      screen: {
        id: newId(),
        title: name.length > 48 ? `${name.slice(0, 48)}…` : name,
        kind: 'image',
        text: '',
        color: '#0B1226',
        imageUri: uri,
        mirror: false,
        createdAt: Date.now(),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Nie udało się zaimportować obrazu.',
    };
  }
}

/**
 * Take the text currently on the clipboard — copied in any other app — and turn it into a
 * text board. This is the fastest route from, say, a note or a web page to the surface.
 */
export async function importTextFromClipboard(): Promise<ImportResult> {
  try {
    const hasText = await Clipboard.hasStringAsync();
    if (!hasText) {
      return {
        status: 'error',
        message: 'Schowek jest pusty. Skopiuj tekst w innej aplikacji i spróbuj ponownie.',
      };
    }
    const text = await Clipboard.getStringAsync();
    if (!text || text.trim().length === 0) {
      return { status: 'error', message: 'W schowku nie ma tekstu.' };
    }

    return {
      status: 'ok',
      screen: {
        id: newId(),
        title: titleOf(text, 'Tekst z innej aplikacji'),
        kind: 'text',
        text: previewOf(text),
        color: '#0B1226',
        imageUri: null,
        mirror: false,
        createdAt: Date.now(),
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Nie udało się odczytać schowka.',
    };
  }
}

/** True when the platform can reach other apps' file providers and the clipboard. */
export const canImportFromApps = Platform.OS !== 'web';
