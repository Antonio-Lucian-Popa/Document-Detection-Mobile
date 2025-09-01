// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginReq } from '../services/auth';
import { getTokens, saveTokens, clearTokens } from '../services/tokenStorage';
import { initTokens, setTokensForSession, LogoutBus } from '../services/http';
import { fetchUserInfoById, UserInfo } from '../services/user';
import { getUserIdFromToken } from '../services/jwt';

type AuthCtx = {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await initTokens();
      const saved = await getTokens();
      if (saved?.accessToken) {
        setTokensForSession(saved);
        try {
          const uid = getUserIdFromToken(saved.accessToken);
          if (uid != null) {
            const u = await fetchUserInfoById(uid);
            setUser(u);
          }
        } catch {
          await clearTokens();
          setTokensForSession(null);
        }
      }
      setLoading(false);
    })();

    LogoutBus.onLogout(async () => { await logout(); });
  }, []);

  const reloadUser = async () => {
    const u = await fetchUserInfoById();
    setUser(u);
  };

  const login = async (username: string, password: string) => {
    const { tokens } = await loginReq({ username, password });
    await saveTokens(tokens);
    setTokensForSession(tokens);

    const uid = getUserIdFromToken(tokens.accessToken);
    if (uid != null) {
      const u = await fetchUserInfoById(uid);
      console.log("User Info:", u);
      setUser(u);
    }
  };

  const logout = async () => {
    await clearTokens();
    setTokensForSession(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user, isLoading, isAuthenticated: !!user, login, logout, reloadUser,
  }), [user, isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
