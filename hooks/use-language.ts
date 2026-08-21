import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveUserSettingsApi } from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';
import i18n from '@/src/i18n';
import { translateTextWithGoogle } from '@/src/services/translateService';

export type AppLanguage = 'en' | 'kn';
const LANGUAGE_STORAGE_KEY = 'vibe_app_language';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
];

let currentLanguage: AppLanguage = 'en';
const listeners = new Set<(lang: AppLanguage) => void>();

// Synchronous initial check (web localStorage or existing cached session)
try {
  const session = getUserSessionSync();
  if (session?.language === 'kn' || session?.language === 'en') {
    currentLanguage = session.language as AppLanguage;
  } else if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'kn' || saved === 'en') {
      currentLanguage = saved as AppLanguage;
    }
  }
} catch (e) {
  // Ignore fallback
}

export function getAppLanguage(): AppLanguage {
  return currentLanguage;
}

/**
 * Asynchronously load persistent language from AsyncStorage or user session on app launch
 */
export async function loadAppLanguageAsync(): Promise<AppLanguage> {
  try {
    const session = getUserSessionSync();
    if (session?.language === 'kn' || session?.language === 'en') {
      currentLanguage = session.language as AppLanguage;
      if (i18n && i18n.changeLanguage) {
        i18n.changeLanguage(currentLanguage);
      }
      listeners.forEach((l) => l(currentLanguage));
      return currentLanguage;
    }

    const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLang === 'kn' || savedLang === 'en') {
      currentLanguage = savedLang as AppLanguage;
      if (i18n && i18n.changeLanguage) {
        i18n.changeLanguage(currentLanguage);
      }
      listeners.forEach((l) => l(currentLanguage));
      return currentLanguage;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const webLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (webLang === 'kn' || webLang === 'en') {
        currentLanguage = webLang as AppLanguage;
        if (i18n && i18n.changeLanguage) {
          i18n.changeLanguage(currentLanguage);
        }
        listeners.forEach((l) => l(currentLanguage));
        return currentLanguage;
      }
    }
  } catch (e) {
    console.warn('Failed to load language from storage:', e);
  }

  return currentLanguage;
}

/**
 * Set and persist app language across i18n, AsyncStorage, user session, and backend
 */
export function setAppLanguage(lang: AppLanguage, syncBackend: boolean = true) {
  currentLanguage = lang;
  if (i18n && i18n.changeLanguage) {
    i18n.changeLanguage(lang);
  }
  listeners.forEach((l) => l(lang));

  // Persist locally in AsyncStorage and localStorage
  (async () => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      }
    } catch (e) {
      console.warn('Failed to save language to AsyncStorage:', e);
    }
  })();

  // Sync to session and backend database asynchronously
  try {
    const session = getUserSessionSync();
    if (session) {
      session.language = lang;
      saveUserSession(session);
      if (syncBackend && session.id) {
        saveUserSettingsApi(session.id, { language: lang }).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore error if offline
  }
}

export function useLanguage(): [AppLanguage, (lang: AppLanguage) => void] {
  const [lang, setLang] = useState<AppLanguage>(currentLanguage);

  useEffect(() => {
    loadAppLanguageAsync().then((resolvedLang) => {
      setLang(resolvedLang);
    });

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

/**
 * Custom React Hook to translate any dynamic text string on the fly using Google Translate
 */
export function useAutoTranslate(text: string): string {
  const [lang] = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    let isMounted = true;
    if (!text || lang === 'en') {
      setTranslatedText(text);
      return;
    }

    translateTextWithGoogle(text, lang).then((res) => {
      if (isMounted) {
        setTranslatedText(res);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [text, lang]);

  return translatedText;
}

