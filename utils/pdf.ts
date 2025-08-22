import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { ROOT_DIR } from './storage';

export async function createPdfFromImages(imageUris: string[], id?: string): Promise<string> {
  const pdf = await PDFDocument.create();

  for (const uri of imageUris) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Buffer.from(base64, 'base64');
    const isPng = uri.toLowerCase().endsWith('.png');
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }

  const pdfBytes = await pdf.save();
  const name = `scan_${id ?? Date.now()}.pdf`;
  const pdfUri = ROOT_DIR + name; // ex: file:///data/.../scans/scan_123.pdf
  await FileSystem.writeAsStringAsync(pdfUri, Buffer.from(pdfBytes).toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return pdfUri;
}
