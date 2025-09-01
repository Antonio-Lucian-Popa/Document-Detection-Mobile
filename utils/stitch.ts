// src/utils/stitch.ts
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import RNPhotoManipulator, { MimeType } from 'react-native-photo-manipulator';
import { ensureDirs, IMAGES_DIR } from './storage';

const getSize = (uri: string) =>
  new Promise<{ w: number; h: number }>((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({ w, h }), reject)
  );

// 1) Asigură-te că avem un "file://". Dacă e "content://", îl copiem în cache.
async function ensureFileUri(src: string, ext = 'jpg'): Promise<string> {
  if (src.startsWith('file://')) return src;

  const dest = `${FileSystem.cacheDirectory}ci_src_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  // Mai întâi încercăm un copy direct (merge pe multe "content://")
  try {
    await FileSystem.copyAsync({ from: src, to: dest });
    return dest;
  } catch {}

  // Dacă copyAsync nu merge, citim ca Base64 și rescriem (fără să schimbăm scanarea!)
  try {
    const b64 = await FileSystem.readAsStringAsync(src, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(dest, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return dest;
  } catch (e) {
    // ultimul fallback: încearcă să elimini eventualul prefix "content://"
    // (pe unele device-uri vine deja cu "file:/..." fără al doilea slash)
    if (src.startsWith('file:/') && !src.startsWith('file://')) {
      return `file://${src.replace(/^file:\/*/, '')}`;
    }
    throw new Error(`Nu pot converti sursa în fișier local: ${src}`);
  }
}

// 2) "Resize" proporțional (crop pe toată imaginea + targetSize)
async function resizeKeepAspect(fileUri: string, targetW: number) {
  const { w, h } = await getSize(fileUri);
  const targetH = Math.round((h / w) * targetW);
  const out = await RNPhotoManipulator.crop(
    fileUri,
    { x: 0, y: 0, width: w, height: h },
    { width: targetW, height: targetH },
    MimeType.JPEG
  );
  return {
    uri: out.startsWith('file://') ? out : `file://${out}`,
    w: targetW,
    h: targetH,
  };
}

// 3) Fă o pânză albă pe disc la dimensiunea dorită (folosind un pixel alb 1x1)
async function makeBlankCanvas(width: number, height: number) {
  const whitePixelPath = `${FileSystem.cacheDirectory}white1px.jpg`;
  // creează o bază dacă nu există
  try {
    await FileSystem.getInfoAsync(whitePixelPath).then(async (i) => {
      if (!i.exists) {
        // scriem un pixel alb
        await FileSystem.writeAsStringAsync(
          whitePixelPath,
          '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAUFBQUFBQYGBgYGBgYICAcICAkKCQoKCg0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N//AABEIAAEAAQMBIgACEQEDEQH/xAAXAAADAQAAAAAAAAAAAAAAAAABAgME/8QAFxEAAwEAAAAAAAAAAAAAAAAAAAECEv/aAAwDAQACEAMQAAAB5A==',
          { encoding: FileSystem.EncodingType.Base64 }
        );
      }
    });
  } catch {}
  // "redimensionăm" pixelul la dimensiunea canvas-ului
  const canvas = await RNPhotoManipulator.crop(
    whitePixelPath,
    { x: 0, y: 0, width: 1, height: 1 },
    { width, height },
    MimeType.JPEG
  );
  return canvas.startsWith('file://') ? canvas : `file://${canvas}`;
}

/** Concatenează vertical FAȚA (sus) + VERSO (jos) într-o singură poză .jpg */
export async function stitchCI(
  frontSrc: string,
  backSrc: string,
  outW = 1400,
  gap = 0
): Promise<string> {
  // A) normalizăm orice URI la file://
  const frontFile = await ensureFileUri(frontSrc, 'jpg');
  const backFile  = await ensureFileUri(backSrc,  'jpg');

  // B) redimensionăm proporțional la aceeași lățime
  const [f, b] = await Promise.all([
    resizeKeepAspect(frontFile, outW),
    resizeKeepAspect(backFile,  outW),
  ]);
  const outH = f.h + gap + b.h;

  // C) pânză + overlay
  let base = await makeBlankCanvas(outW, outH);
  base = await RNPhotoManipulator.overlayImage(base, f.uri, { x: 0, y: 0 }, MimeType.JPEG);
  base = await RNPhotoManipulator.overlayImage(base, b.uri, { x: 0, y: f.h + gap }, MimeType.JPEG);

  // D) mutăm în folderul aplicației
  await ensureDirs();
  const finalUri = `${IMAGES_DIR}ci_${Date.now()}.jpg`;
  const from = base.startsWith('file://') ? base : `file://${base}`;
  await FileSystem.copyAsync({ from, to: finalUri });
  return finalUri;
}
