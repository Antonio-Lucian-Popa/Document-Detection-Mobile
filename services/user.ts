// src/services/user.ts
import { api } from './http';
import { getUserIdFromToken } from './jwt';
import { getTokens } from './tokenStorage';

export type UserInfo = {
    userid: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    groups: string[];
    marca?: string;
};

export async function fetchUserInfoById(id?: number): Promise<UserInfo> {
    // 1) determinăm user_id din param sau din token
    let uid = id;
    if (uid == null) {
        const t = await getTokens();
        uid = t?.accessToken ? getUserIdFromToken(t.accessToken) ?? undefined : undefined;
    }
    if (uid == null) {
        throw new Error('Nu pot determina user_id din token (nu ești autentificat sau token invalid).');
    }

    // 2) cerem userinfo (interceptorul atașează Bearer automat)
    const { data } = await api.get(`/oidc_userinfo/${uid}/`);
    const userData = data as UserInfo;

    return {
        userid: userData.userid ?? uid,
        username: userData.username ?? '',
        email: userData.email ?? '',
        first_name: userData.first_name ?? '',
        last_name: userData.last_name ?? '',
        groups: Array.isArray(userData.groups) ? userData.groups : [],
        marca: userData.marca ?? undefined,
    };
}
