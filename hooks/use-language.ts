import { useEffect, useState } from 'react';
import { saveUserSettingsApi } from '@/constants/api';
import { getUserSessionSync, saveUserSession } from '@/constants/authStore';
import i18n from '@/src/i18n';
import { translateTextWithGoogle } from '@/src/services/translateService';

export type AppLanguage = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml';

export interface LanguageOption {
  code: AppLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
];

let currentLanguage: AppLanguage = 'en';
const listeners = new Set<(lang: AppLanguage) => void>();

// Initialize language from stored user session synchronously if available
try {
  const session = getUserSessionSync();
  if (session?.language && SUPPORTED_LANGUAGES.some((l) => l.code === session.language)) {
    currentLanguage = session.language as AppLanguage;
  }
} catch (e) {
  // Ignore fallback
}

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
