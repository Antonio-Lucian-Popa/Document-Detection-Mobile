// src/services/employees.ts
import { api } from './http';

export type Employee = {
  id: number;
  nume?: string;
  prenume?: string;
  name: string;     // nume complet derivat
  marca?: string;
  telefon?: string;
  imagine?: string | null; // URL absolut (dacă există)
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

const PAGE_SIZE = 20;

function toAbsoluteUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (api.defaults.baseURL || '').replace(/\/+$/, '');
  const rel = String(pathOrUrl).replace(/^\/+/, '');
  return `${base}/${rel}`;
}

export async function fetchEmployeesPage(params: {
  search?: string;
  offset?: number;   // default 0
  limit?: number;    // default 20
  // poți adăuga fields custom dacă vrei
}): Promise<{ items: Employee[]; hasMore: boolean; nextOffset: number }> {
  const limit = params.limit ?? PAGE_SIZE;
  const offset = params.offset ?? 0;

  const fields = 'id,nume,prenume,marca,telefon,imagine';
  const { data } = await api.get('/angajati_serverside_list/', {
    params: {
      fields,
      search: params.search ?? '',
      limit,
      offset,
    },
  });

  const items: Employee[] = (data?.results ?? []).map((row: any) => {
    const name = [row.nume, row.prenume].filter(Boolean).join(' ').trim() || row.username || String(row.id);
    return {
      id: row.id,
      nume: row.nume,
      prenume: row.prenume,
      name,
      marca: row.marca,
      telefon: row.telefon,
      imagine: toAbsoluteUrl(row.imagine),
    };
  });

  const hasMore = items.length === limit;
  const nextOffset = offset + items.length;

  return { items, hasMore, nextOffset };
}
