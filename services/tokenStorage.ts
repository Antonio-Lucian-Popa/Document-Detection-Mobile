// src/services/tokenStorage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'AUTH_TOKENS_V1';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessExp?: number; // epoch sec (opțional)
};

const hasSecureStore = true; // pe Expo există pe ambele platforme

export async function saveTokens(tokens: AuthTokens) {
  const data = JSON.stringify(tokens);
  if (hasSecureStore) await SecureStore.setItemAsync(KEY, data);
  else await AsyncStorage.setItem(KEY, data);
}

export async function getTokens(): Promise<AuthTokens | null> {
    console.log("Retrieving tokens...");
  const data = hasSecureStore
    ? await SecureStore.getItemAsync(KEY)
    : await AsyncStorage.getItem(KEY);
    console.log("Retrieved tokens data:", data);
  return data ? (JSON.parse(data) as AuthTokens) : null;
}

export async function clearTokens() {
  if (hasSecureStore) await SecureStore.deleteItemAsync(KEY);
  else await AsyncStorage.removeItem(KEY);
}
