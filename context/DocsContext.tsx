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
  pages: string[];
  pdfUri?: string;
  kind: 'image' | 'pdf';
  meta?: DocMeta;
  createdAt: number;
};

type DocsCtx = {
  docs: Doc[];
  addFromImages: (imageUris: string[], meta?: DocMeta) => Promise<Doc>;
  addImageOnly: (imageUri: string, meta?: DocMeta) => Promise<Doc>;
  removeDoc: (id: string) => Promise<void>;
};
const Ctx = createContext<DocsCtx | null>(null);

// ID unic: timp + random (fără dependențe)
const makeId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const DocsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    (async () => {
      await ensureDirs();
      const saved = await loadDocsFromStorage<Doc[]>();
      if (saved?.length) {
        // dedupe după id (păstrează prima apariție)
        const map = new Map<string, Doc>();
        for (const d of saved) if (!map.has(d.id)) map.set(d.id, d);
        setDocs(Array.from(map.values()));
      }
    })();
  }, []);

  const addFromImages = async (imageUris: string[], meta?: DocMeta) => {
    await ensureDirs();
    const id = makeId();
    const copied = await Promise.all(imageUris.map((u, i) => copyImageIntoStore(u, id, i)));
    const pdfUri = await createPdfFromImages(copied, id);
    const newDoc: Doc = { id, pages: copied, pdfUri, kind: 'pdf', meta, createdAt: Date.now() };

    // setare funcțională + persist
    let updated: Doc[] = [];
    setDocs(prev => {
      updated = [newDoc, ...prev];
      return updated;
    });
    await saveDocsToStorage(updated);
    return newDoc;
  };

  const addImageOnly = async (imageUri: string, meta?: DocMeta) => {
    await ensureDirs();
    const id = makeId();
    const stored = await copyImageIntoStore(imageUri, id, 0);
    const newDoc: Doc = { id, pages: [stored], kind: 'image', meta, createdAt: Date.now() };

    let updated: Doc[] = [];
    setDocs(prev => {
      updated = [newDoc, ...prev];
      return updated;
    });
    await saveDocsToStorage(updated);
    return newDoc;
  };

  const removeDoc = async (id: string) => {
    const target = docs.find(d => d.id === id);
    if (!target) return;

    const uris = [...target.pages, target.pdfUri].filter(Boolean) as string[];
    const results = await Promise.allSettled(uris.map(u => removeFileIfExists(u)));
    if (results.some(r => r.status === 'rejected')) {
      console.warn('Unele fișiere nu s-au putut șterge:', results);
    }

    let updated: Doc[] = [];
    setDocs(prev => {
      updated = prev.filter(d => d.id !== id);
      return updated;
    });
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
