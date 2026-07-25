import { useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { saveUserSettingsApi } from '@/constants/api';
import { getUserSessionSync } from '@/constants/authStore';

type Theme = 'light' | 'dark';

let currentTheme: Theme | null = null;
const listeners = new Set<(theme: Theme) => void>();

export function getAppTheme(): Theme {
  return currentTheme || 'dark';
}

export function setAppTheme(theme: Theme) {
  currentTheme = theme;
  listeners.forEach((l) => l(theme));

  // Auto-sync theme to PostgreSQL backend database
  try {
    const session = getUserSessionSync();
    if (session?.id) {
      saveUserSettingsApi(session.id, { theme });
    }
  } catch (e) {
    // Ignore if unauthenticated
  }
}

export function toggleAppTheme() {
  setAppTheme(getAppTheme() === 'light' ? 'dark' : 'light');
}

export function useColorScheme(): Theme {
  const deviceTheme = useDeviceColorScheme() || 'dark';
  const [theme, setTheme] = useState<Theme>(currentTheme || deviceTheme);

  useEffect(() => {
    if (!currentTheme) {
      currentTheme = deviceTheme;
    }
    const listener = (newTheme: Theme) => {
      setTheme(newTheme);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [deviceTheme]);

  return theme;
}
