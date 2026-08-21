import { useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserSettingsApi } from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';

export type AppTheme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'vibe_app_theme';

let currentTheme: AppTheme | null = null;
const listeners = new Set<(theme: AppTheme) => void>();

// Synchronous initial check (web localStorage or existing cached session)
try {
  const session = getUserSessionSync();
  if (session?.theme === 'light' || session?.theme === 'dark') {
    currentTheme = session.theme;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      currentTheme = saved as AppTheme;
    }
  }
} catch (e) {
  // Ignore fallback
}

export function getAppTheme(): AppTheme {
  return currentTheme || 'dark';
}

/**
 * Asynchronously load persistent theme from AsyncStorage or user session on app launch
 */
export async function loadAppThemeAsync(): Promise<AppTheme> {
  try {
    const session = getUserSessionSync();
    if (session?.theme === 'light' || session?.theme === 'dark') {
      currentTheme = session.theme;
      listeners.forEach((l) => l(currentTheme!));
      return currentTheme;
    }

    const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      currentTheme = savedTheme as AppTheme;
      listeners.forEach((l) => l(currentTheme!));
      return currentTheme;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const webTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (webTheme === 'light' || webTheme === 'dark') {
        currentTheme = webTheme as AppTheme;
        listeners.forEach((l) => l(currentTheme!));
        return currentTheme;
      }
    }
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
  }

  if (!currentTheme) {
    currentTheme = 'dark';
  }
  return currentTheme;
}

/**
 * Set and persist app theme across AsyncStorage, user session, and backend
 */
export function setAppTheme(theme: AppTheme, syncBackend: boolean = true) {
  currentTheme = theme;
  listeners.forEach((l) => l(theme));

  // Persist locally in AsyncStorage and localStorage
  (async () => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch (e) {
      console.warn('Failed to save theme to AsyncStorage:', e);
    }
  })();

  // Update in-memory and persistent session
  try {
    const session = getUserSessionSync();
    if (session) {
      session.theme = theme;
      saveUserSession(session);
      if (syncBackend && session.id) {
        saveUserSettingsApi(session.id, { theme }).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore error
  }
}

export function toggleAppTheme() {
  setAppTheme(getAppTheme() === 'light' ? 'dark' : 'light');
}

export function useColorScheme(): AppTheme {
  const deviceTheme = useDeviceColorScheme() || 'dark';
  const [theme, setTheme] = useState<AppTheme>(currentTheme || deviceTheme);

  useEffect(() => {
    if (!currentTheme) {
      loadAppThemeAsync().then((resolvedTheme) => {
        setTheme(resolvedTheme);
      });
    }

    const listener = (newTheme: AppTheme) => {
      setTheme(newTheme);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [deviceTheme]);

  return theme;
}


