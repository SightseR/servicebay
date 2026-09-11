import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import it from './it.json';

export const SUPPORTED_LANGUAGES = ['it', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const STORAGE_KEY = 'sb-lang';

const isSupported = (v: unknown): v is AppLanguage => SUPPORTED_LANGUAGES.includes(v as AppLanguage);

/** IT is the default (client requirement); a prior choice in this browser is remembered. */
export function getInitialLanguage(): AppLanguage {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isSupported(stored)) return stored;
  } catch {
    // localStorage unavailable (private mode etc) — fall through to default
  }
  return 'it';
}

export function persistLanguage(lang: AppLanguage) {
  try { window.localStorage.setItem(STORAGE_KEY, lang); } catch { /* best effort */ }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, it: { translation: it } },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
