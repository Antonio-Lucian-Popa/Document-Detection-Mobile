// src/services/jwt.ts
import { jwtDecode } from 'jwt-decode';

export type JwtPayload = {
  exp?: number;
  iat?: number;
  user_id?: number; // Django SimpleJWT pune de obicei user_id numeric
  [k: string]: unknown;
};

export function getAccessExp(token: string): number | undefined {
  try {
    const { exp } = jwtDecode<JwtPayload>(token);
    return exp; // epoch seconds
  } catch {
    return undefined;
  }
}

export function getUserIdFromToken(token: string): number | null {
  try {
    const { user_id } = jwtDecode<JwtPayload>(token);
    return (user_id as number | undefined) ?? null;
  } catch {
    return null;
  }
}
