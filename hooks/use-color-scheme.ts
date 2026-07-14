import { useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';

type Theme = 'light' | 'dark';

let currentTheme: Theme | null = null;
const listeners = new Set<(theme: Theme) => void>();

export function getAppTheme(): Theme {
  return currentTheme || 'dark';
}

export function setAppTheme(theme: Theme) {
  currentTheme = theme;
  listeners.forEach((l) => l(theme));
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
