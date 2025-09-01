// src/services/http.ts
import axios from 'axios';
import { getTokens, saveTokens, clearTokens, AuthTokens } from './tokenStorage';
import { getAccessExp } from './jwt';

// const API_URL = 'https://test.uti.umbgrup.ro';
const API_URL = 'http://10.10.100.153:8000';

// Notificare logout global (opțional; AuthContext se abonează)
export const LogoutBus = {
  cb: null as null | (() => void),
  onLogout(fn: () => void) { this.cb = fn; },
  trigger() { this.cb?.(); },
};

let tokensCache: AuthTokens | null = null;
let isRefreshing = false;
let refreshWaiters: Array<(t: string | null) => void> = [];

export async function initTokens() {
  tokensCache = await getTokens();
}

function onRefreshed(newAccess: string | null) {
  refreshWaiters.forEach((cb) => cb(newAccess));
  refreshWaiters = [];
}

async function refreshAccessToken(): Promise<string | null> {
  if (!tokensCache?.refreshToken) return null;
  try {
    // SimpleJWT: body = { refresh: "<refresh-token>" }
    interface RefreshResponse {
      access?: string;
      refresh?: string;
      [key: string]: any;
    }

    const res = await axios.post<RefreshResponse>(`${API_URL}/rest_api/token/refresh/`, {
      refresh: tokensCache.refreshToken,
    });

    // Răspuns tipic: { access } sau { access, refresh } (rotation)
    const newAccess: string | undefined = res.data?.access;
    if (!newAccess) throw new Error('refresh response missing access');

    const maybeNewRefresh: string | undefined = res.data?.refresh;

    const newTokens: AuthTokens = {
      accessToken: newAccess,
      refreshToken: maybeNewRefresh ?? tokensCache.refreshToken,
      accessExp: getAccessExp(newAccess), // epoch seconds din JWT
    };

    tokensCache = newTokens;
    await saveTokens(newTokens);
    return newAccess;
  } catch {
    // curăță și anunță UI-ul
    await clearTokens();
    tokensCache = null;
    LogoutBus.trigger?.();
    return null;
  }
}

export const api: any = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

export const apiNoAuth: any = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Atașează automat Bearer
api.interceptors.request.use((config: any) => {
  if (tokensCache?.accessToken) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${tokensCache.accessToken}`,
    };
  }
  return config;
});

// 401 -> refresh -> re-try
api.interceptors.response.use(
  (res: any) => res,
  async (error: any) => {
    const status = error?.response?.status;
    const original = (error?.config || {}) as any & { _retry?: boolean };

    // Pentru erori de rețea fără response, nu încercăm refresh
    if (!status) return Promise.reject(error);

    if (status === 401 && !original._retry) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        const newAccess = await refreshAccessToken();
        isRefreshing = false;
        onRefreshed(newAccess);
      }

      // așteaptă rezultatul refresh-ului
      return new Promise((resolve, reject) => {
        refreshWaiters.push(async (newAccess) => {
          if (newAccess) {
            original.headers = {
              ...(original.headers || {}),
              Authorization: `Bearer ${newAccess}`,
            };
            try {
              const resp = await api.request(original);
              resolve(resp);
            } catch (e) {
              reject(e);
            }
          } else {
            reject(error); // va fi prins mai sus în UI; AuthContext va face logout
          }
        });
      });
    }

    return Promise.reject(error);
  }
);

// Setați token-ele în memorie după login
export function setTokensForSession(t: AuthTokens | null) {
  tokensCache = t;
}
