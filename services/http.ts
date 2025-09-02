// src/services/http.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTokens, saveTokens, clearTokens, AuthTokens } from './tokenStorage';
import { getAccessExp } from './jwt';

const API_URL = 'https://test.uti.umbgrup.ro';
// const API_URL = 'http://10.10.100.153:8000';

export const LogoutBus = {
  cb: null as null | (() => void),
  onLogout(fn: () => void) { this.cb = fn; },
  trigger() { this.cb?.(); },
};

let tokensCache: AuthTokens | null = null;
let isRefreshing = false;
let waiters: Array<(t: string | null) => void> = [];

export async function initTokens() {
  tokensCache = await getTokens();
}

function notifyWaiters(newAccess: string | null) {
  waiters.forEach(cb => cb(newAccess));
  waiters = [];
}

function shouldPreRefresh(): boolean {
  if (!tokensCache?.accessToken || !tokensCache?.accessExp) return false;
  const now = Math.floor(Date.now() / 1000);
  // dacă mai sunt <60 secunde din viața access token-ului -> pre-refresh
  return tokensCache.accessExp - now < 60;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!tokensCache?.refreshToken) return null;

  try {
    // SimpleJWT expects: { refresh: "<refresh-token>" }
    const res = await axios.post<{ access?: string; refresh?: string }>(
      `${API_URL}/rest_api/token/refresh/`,
      { refresh: tokensCache.refreshToken },
      { timeout: 15000 }
    );

    const newAccess = res.data?.access;
    if (!newAccess) throw new Error('refresh response missing access');

    const maybeNewRefresh = res.data?.refresh;
    const newTokens: AuthTokens = {
      accessToken: newAccess,
      refreshToken: maybeNewRefresh ?? tokensCache.refreshToken,
      accessExp: getAccessExp(newAccess),
    };

    tokensCache = newTokens;
    await saveTokens(newTokens);
    return newAccess;
  } catch (e) {
    // refresh a eșuat -> logout
    await clearTokens();
    tokensCache = null;
    LogoutBus.trigger?.();
    return null;
  }
}

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });
export const apiNoAuth = axios.create({ baseURL: API_URL, timeout: 15000 });

// ====== REQUEST interceptor (pre-refresh) ======
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // nu atașa bearer și nu face refresh când lovești endpoint-ul de refresh
  const isRefreshEndpoint =
    (config.url || '').includes('/rest_api/token/refresh/');

  // Proactive refresh dacă e pe cale să expire
  if (!isRefreshEndpoint && shouldPreRefresh()) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newAccess = await refreshAccessToken();
      isRefreshing = false;
      notifyWaiters(newAccess);
    } else {
      // așteaptă refresh-ul curent
      await new Promise<void>((resolve, reject) => {
        waiters.push((newAccess) => newAccess ? resolve() : reject(new Error('refresh failed')));
      });
    }
  }

  // atașează bearer dacă există
  if (tokensCache?.accessToken && !isRefreshEndpoint) {
    if (config.headers) {
      config.headers['Authorization'] = `Bearer ${tokensCache.accessToken}`;
    }
  }
  return config;
});

// ====== RESPONSE interceptor (401/403 -> refresh -> retry) ======
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<any>) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!status || !original) {
      // erori de rețea fără response -> nu încercăm refresh aici
      return Promise.reject(error);
    }

    const url = original.url || '';
    const isRefreshEndpoint = url.includes('/rest_api/token/refresh/');
    if (isRefreshEndpoint) return Promise.reject(error);

    // SimpleJWT trimite adesea:
    // { code: "token_not_valid", detail: "...", messages: [...] }
    const code = (error.response?.data as any)?.code;

    const shouldTryRefresh =
      !original._retry &&
      (status === 401 || (status === 403 && code === 'token_not_valid'));

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      const newAccess = await refreshAccessToken();
      isRefreshing = false;
      notifyWaiters(newAccess);
    }

    // așteaptă rezultatul refresh-ului și reîncearcă request-ul
    return new Promise((resolve, reject) => {
      waiters.push(async (newAccess) => {
        if (!newAccess) return reject(error);
        try {
          if (original.headers && typeof (original.headers as any).set === 'function') {
            // AxiosHeaders instance
            (original.headers as any).set('Authorization', `Bearer ${newAccess}`);
          } else {
            // plain object
            if (original.headers) {
              (original.headers as any)['Authorization'] = `Bearer ${newAccess}`;
            } else {
              original.headers = { Authorization: `Bearer ${newAccess}` } as any;
            }
          }
          const resp = await api.request(original);
          resolve(resp);
        } catch (e) {
          reject(e);
        }
      });
    });
  }
);

// expune setarea tokenelor după login
export function setTokensForSession(t: AuthTokens | null) {
  tokensCache = t;
}
