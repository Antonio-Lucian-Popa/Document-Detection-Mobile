import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createPdfFromImages } from '../utils/pdf';
import { copyImageIntoStore, ensureDirs, loadDocsFromStorage, removeFileIfExists, saveDocsToStorage } from '../utils/storage';

export type Doc = {
  id: string;
  pages: string[];   // uri-urile imaginilor (copiate în app dir)
  pdfUri: string;    // pdf salvat în app dir
  createdAt: number;
};

type DocsCtx = {
  docs: Doc[];
  addFromImages: (imageUris: string[]) => Promise<Doc>;
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

  const addFromImages = async (imageUris: string[]) => {
    await ensureDirs();
    const id = String(Date.now());

    // copiem imaginile în directorul aplicației (persistente)
    const copied = await Promise.all(imageUris.map((u, i) => copyImageIntoStore(u, id, i)));

    // creăm PDF din imaginile copiate și îl salvăm în app dir
    const pdfUri = await createPdfFromImages(copied, id);

    const newDoc: Doc = { id, pages: copied, pdfUri, createdAt: Date.now() };
    const updated = [newDoc, ...docs];

    setDocs(updated);
    await saveDocsToStorage(updated);

    return newDoc;
  };

  const removeDoc = async (id: string) => {
    const target = docs.find(d => d.id === id);
    if (target) {
      for (const p of target.pages) await removeFileIfExists(p);
      await removeFileIfExists(target.pdfUri);
    }
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    await saveDocsToStorage(updated);
  };

  const value = useMemo(() => ({ docs, addFromImages, removeDoc }), [docs]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useDocs = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDocs must be used within DocsProvider');
  return ctx;
};
