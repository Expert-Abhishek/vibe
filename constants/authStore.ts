import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'tourist' | 'driver' | 'guide' | 'admin';
  status: string;
  token?: string;
  theme?: 'light' | 'dark';
  language?: string;
  profile?: any;
}

const SESSION_KEY = 'vibe_user_session_v1';

let cachedSession: UserSession | null = null;

/**
 * Save user session persistently across app restarts on mobile (AsyncStorage) and web (localStorage)
 */
export async function saveUserSession(session: UserSession): Promise<void> {
  cachedSession = session;
  try {
    const jsonValue = JSON.stringify(session);
    await AsyncStorage.setItem(SESSION_KEY, jsonValue);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_KEY, jsonValue);
    }
  } catch (e) {
    console.warn('Failed to save session to persistent storage:', e);
  }
}

/**
 * Asynchronously load persistent session from AsyncStorage/localStorage on app launch
 */
export async function loadUserSessionAsync(): Promise<UserSession | null> {
  if (cachedSession) return cachedSession;
  try {
    const jsonValue = await AsyncStorage.getItem(SESSION_KEY);
    if (jsonValue != null) {
      cachedSession = JSON.parse(jsonValue);
      return cachedSession;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SESSION_KEY);
      if (data) {
        cachedSession = JSON.parse(data);
        return cachedSession;
      }
    }
  } catch (e) {
    console.warn('Failed to load session from persistent storage:', e);
  }
  return null;
}

/**
 * Synchronously retrieve current cached session in memory
 */
export function getUserSessionSync(): UserSession | null {
  if (cachedSession) return cachedSession;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem(SESSION_KEY);
      if (data) {
        cachedSession = JSON.parse(data);
        return cachedSession;
      }
    }
  } catch (e) {
    console.warn('Failed to read session sync:', e);
  }
  return null;
}

/**
 * Clear stored user session on explicit logout
 */
export async function clearUserSession(): Promise<void> {
  cachedSession = null;
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}
