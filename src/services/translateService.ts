import { getAppLanguage, AppLanguage } from '@/hooks/use-language';

const translationMemoryCache = new Map<string, string>();

/**
 * Perform translation using free public Google Translate API (client=gtx)
 * @param text Text string to translate
 * @param targetLang Language code (en, hi, kn, ta, te, ml, etc.)
 * @returns Translated text string
 */
export async function translateTextWithGoogle(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  if (!targetLang || targetLang === 'en') return text;

  const cacheKey = `${targetLang}:${text.trim()}`;
  if (translationMemoryCache.has(cacheKey)) {
    return translationMemoryCache.get(cacheKey)!;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(text)}`;

    const response = await fetch(url);
    if (!response.ok) {
      return text;
    }

    const data = await response.json();
    if (data && Array.isArray(data[0])) {
      const translated = data[0]
        .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
        .join('');

      if (translated) {
        translationMemoryCache.set(cacheKey, translated);
        return translated;
      }
    }
    return text;
  } catch (err) {
    console.warn('Google Translation fetch error:', err);
    return text;
  }
}

/**
 * Batch translation helper for translating an array of text strings at once
 */
export async function translateBatchWithGoogle(texts: string[], targetLang: string): Promise<string[]> {
  if (!targetLang || targetLang === 'en' || !texts || texts.length === 0) {
    return texts;
  }

  const promises = texts.map((t) => translateTextWithGoogle(t, targetLang));
  return await Promise.all(promises);
}
