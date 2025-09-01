import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createPdfFromImages } from '../utils/pdf';
import { copyImageIntoStore, ensureDirs, loadDocsFromStorage, removeFileIfExists, saveDocsToStorage } from '../utils/storage';

export type DocMeta = {
  employeeId: number;
  type: string;
  subtip?: string;
  category: 'image' | 'document';
};

export type Doc = {
  id: string;
  pages: string[];        // imagini persistate
  pdfUri?: string;        // setat NUMAI pt. documente
  kind: 'image' | 'pdf';
  meta?: DocMeta;
  createdAt: number;
};

type DocsCtx = {
  docs: Doc[];
  addFromImages: (imageUris: string[], meta?: DocMeta) => Promise<Doc>; // produce PDF
  addImageOnly: (imageUri: string, meta?: DocMeta) => Promise<Doc>;     // doar imagine
  removeDoc: (id: string) => Promise<void>;
};
const Ctx = createContext<DocsCtx | null>(null);

export const DocsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [docs, setDocs] = useState<Doc[]>([]);

  // încarcă din storage la pornire
  useEffect(() => {
    (async () => {
      await ensureDirs();
      const saved = await loadDocsFromStorage<Doc[]>();
      if (saved?.length) setDocs(saved);
    })();
  }, []);

  const addFromImages = async (imageUris: string[], meta?: DocMeta) => {
    await ensureDirs();
    const id = String(Date.now());
    const copied = await Promise.all(imageUris.map((u, i) => copyImageIntoStore(u, id, i)));
    const pdfUri = await createPdfFromImages(copied, id);
    const newDoc: Doc = { id, pages: copied, pdfUri, kind: 'pdf', meta, createdAt: Date.now() };
    const updated = [newDoc, ...docs];
    setDocs(updated); await saveDocsToStorage(updated);
    return newDoc;
  };

  const addImageOnly = async (imageUri: string, meta?: DocMeta) => {
    await ensureDirs();
    const id = String(Date.now());
    const stored = await copyImageIntoStore(imageUri, id, 0);
    const newDoc: Doc = { id, pages: [stored], kind: 'image', meta, createdAt: Date.now() };
    const updated = [newDoc, ...docs];
    setDocs(updated); await saveDocsToStorage(updated);
    return newDoc;
  };

  const removeDoc = async (id: string) => {
    // Găsește doc-ul curent (dacă a dispărut între timp, ieșim lin)
    const target = docs.find(d => d.id === id);
    if (!target) return;

    // Construim lista de URI-uri de șters (ignorăm undefined)
    const uris = [...target.pages, target.pdfUri].filter(Boolean) as string[];

    // Ștergem fișierele în paralel; nu aruncăm dacă vreunul e deja șters
    const results = await Promise.allSettled(
      uris.map(u => removeFileIfExists(u))
    );
    // (opțional) log pentru debugging în caz de eșec parțial
    if (results.some(r => r.status === 'rejected')) {
      console.warn('Unele fișiere nu s-au putut șterge:', results);
    }

    // Actualizăm lista din memorie și persistența
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    await saveDocsToStorage(updated);
  };


  const value = useMemo(() => ({ docs, addFromImages, addImageOnly, removeDoc }), [docs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useDocs = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDocs must be used within DocsProvider');
  return ctx;
};
