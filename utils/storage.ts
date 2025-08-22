import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ROOT_DIR = FileSystem.documentDirectory + 'scans/';
export const IMAGES_DIR = ROOT_DIR + 'images/';
const DOCS_KEY = 'DOCS_V1';

export async function ensureDirs() {
  const root = await FileSystem.getInfoAsync(ROOT_DIR);
  if (!root.exists) await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
  const imgs = await FileSystem.getInfoAsync(IMAGES_DIR);
  if (!imgs.exists) await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
}

export async function copyImageIntoStore(srcUri: string, id: string, idx: number): Promise<string> {
  await ensureDirs();
  const isPng = srcUri.toLowerCase().endsWith('.png');
  const dest = `${IMAGES_DIR}${id}_${idx}.${isPng ? 'png' : 'jpg'}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest; // file://...
}

export async function removeFileIfExists(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function saveDocsToStorage(docs: unknown) {
  await AsyncStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export async function loadDocsFromStorage<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(DOCS_KEY);
  return raw ? (JSON.parse(raw) as T) : null;
}
