import { useEffect, useState } from 'react';
import { saveUserSettingsApi } from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';

export type AppLanguage = 'en' | 'kn';

let currentLanguage: AppLanguage = 'en';
const listeners = new Set<(lang: AppLanguage) => void>();

// Initialize language from stored user session synchronously if available
try {
  const session = getUserSessionSync();
  if (session?.language === 'kn' || session?.language === 'en') {
    currentLanguage = session.language as AppLanguage;
  }
} catch (e) {
  // Ignore fallback
}

import i18n from '@/src/i18n';

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

export function setAppLanguage(lang: AppLanguage) {
  currentLanguage = lang;
  if (i18n && i18n.changeLanguage) {
    i18n.changeLanguage(lang);
  }
  listeners.forEach((l) => l(lang));

  // Sync to session and backend database asynchronously
  try {
    const session = getUserSessionSync();
    if (session) {
      session.language = lang;
      saveUserSession(session);
      if (session.id) {
        saveUserSettingsApi(session.id, { language: lang });
      }
    }
  } catch (e) {
    // Ignore error if offline
  }
}

export function useLanguage(): [AppLanguage, (lang: AppLanguage) => void] {
  const [lang, setLang] = useState<AppLanguage>(currentLanguage);

  useEffect(() => {
    const listener = (newLang: AppLanguage) => {
      setLang(newLang);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [lang, setAppLanguage];
}
