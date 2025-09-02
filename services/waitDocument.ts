// src/services/waitDocument.ts
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { api } from './http';


export type WaitDocListItem = {
  id: number;
  tip: string;
  subtip?: string;
  file: string;          // cale media (ex: "/media/waitdocs/ci_...jpg")
  aproved: boolean;
  angajat?: number | null;
  user_username?: string;
};

export type WaitDocListResp = {
  rows: WaitDocListItem[];
  total: number;
  filtered: number;
};

const COLS = ['id', 'tip', 'subtip', 'file', 'aproved', 'angajat', 'user_username'];


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

export async function listWaitDocuments(opts: {
  start?: number;
  length?: number;
  search?: string;
  aproved?: 0 | 1 | null;           // 0 = neaprobate, 1 = aprobate, null = toate
  orderCol?: number;                // index în COLS
  orderDir?: 'asc' | 'desc';
} = {}): Promise<WaitDocListResp> {
  const {
    start = 0,
    length = 20,
    search = '',
    aproved = null,
    orderCol = 0,
    orderDir = 'desc',
  } = opts;

  // backend-ul tău face getColumns peste request.data; trimitem "columns[i][data]"
  const fd = new FormData();
  COLS.forEach((c, i) => fd.append(`columns[${i}][data]`, c));
  fd.append('start', String(start));
  fd.append('length', String(length));
  fd.append('draw', '1');
  if (search) fd.append('search[value]', search);
  if (aproved !== null) fd.append('aproved', String(aproved));
  fd.append('order[0][column]', String(orderCol));
  fd.append('order[0][dir]', orderDir);

  const { data } = await api.post('/documentescanate/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return {
    rows: (data?.data ?? []) as WaitDocListItem[],
    total: Number(data?.recordsTotal ?? 0),
    filtered: Number(data?.recordsFiltered ?? 0),
  };
}

/** Construieste URL absolut către fișierul media returnat de API */
export function toMediaUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl; // deja absolut
  // api.defaults.baseURL vine din src/services/http.ts
  const base = (api.defaults?.baseURL as string).replace(/\/+$/, '');
  const rel = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${rel}`;
}
