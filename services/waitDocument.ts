// src/services/waitDocument.ts
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { api } from './http';

async function ensureFileUri(src: string, extFallback = 'jpg') {
  if (src.startsWith('file://')) return src;
  const to = `${FileSystem.cacheDirectory}up_${Date.now()}_${Math.random().toString(36).slice(2)}.${extFallback}`;
  try { await FileSystem.copyAsync({ from: src, to }); return to; } catch {}
  const b64 = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
  await FileSystem.writeAsStringAsync(to, b64, { encoding: FileSystem.EncodingType.Base64 });
  return to;
}
function guessMime(nameOrUri: string) {
  const lower = nameOrUri.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}
function guessNameFromUri(uri: string, fallback: string) {
  try {
    const clean = uri.split('?')[0];
    const last = clean.split('/').pop();
    if (last && last.includes('.')) return last;
  } catch {}
  return fallback;
}

export type WaitDocPayload = {
  angajat?: number;      // e optional în serializer, dar îl poți trimite
  tip: string;           // trebuie să fie în choices (ex. "CI", "GDPR", etc.)
  subtip?: string;
  note?: string;
  aproved?: boolean;
  category?: 'image'|'document'; // DOAR pt. client – nu îl trimitem la server
};

export async function createWaitDocument(payload: WaitDocPayload, fileUri: string) {
  const isPdf = payload.category === 'document';
  const norm = await ensureFileUri(fileUri, isPdf ? 'pdf' : 'jpg');

  // NU trimite `category` la server
  const { category, ...clean } = payload;

  const fd = new FormData();
  Object.entries(clean).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });

  const filename = guessNameFromUri(norm, isPdf ? 'document.pdf' : 'imagine.jpg');
  const mime = guessMime(filename);

  // ↑↑↑ numele câmpului de fișier pe BE este FIX `file`
  // @ts-ignore
  fd.append('file', { uri: norm, name: filename, type: mime });

  console.log('FormData:', fd);

  try {
    // nu seta manual Content-Type; RN pune boundary corect
    const res = await api.post('/waitdocument/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return res.data;
  } catch (e: any) {
    console.log('Eroare upload /waitdocument/:', e?.response?.data || e.message || e);
    throw e;
  }
}
