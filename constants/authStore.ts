import { Platform } from 'react-native';

export interface UserSession {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'tourist' | 'driver' | 'guide' | 'admin';
  status: string;
  token?: string;
  profile?: any;
}

const SESSION_KEY = 'vibe_user_session_v1';

let cachedSession: UserSession | null = null;

export async function saveUserSession(session: UserSession): Promise<void> {
  cachedSession = session;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
}

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
    console.warn('Failed to read session:', e);
  }
  return null;
}

export async function clearUserSession(): Promise<void> {
  cachedSession = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}
