import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import { storage } from '../lib/storage';
import { resources } from './resources';

export const LANGUAGES = [
  { code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' }, { code: 'it', name: 'Italiano' },
  { code: 'nl', name: 'Nederlands' }, { code: 'pl', name: 'Polski' }, { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' }, { code: 'tr', name: 'Türkçe' }, { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' }, { code: 'zh', name: '中文' }, { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }, { code: 'id', name: 'Bahasa Indonesia' }, { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ไทย' }, { code: 'sv', name: 'Svenska' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
const RTL = new Set(['ar']);
const KEY = 'lumi.language';

export { resources };

function supported(code: string | null | undefined): LanguageCode | null {
  return code && code in resources ? (code as LanguageCode) : null;
}

function applyDirection(lng: string) {
  const rtl = RTL.has(lng);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    }
  } else if (I18nManager.isRTL !== rtl) {
    // Takes effect after the app restarts.
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

const deviceLanguage = supported(getLocales()[0]?.languageCode) ?? 'en';

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(Object.entries(resources).map(([k, v]) => [k, { translation: v }])),
  lng: deviceLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyDirection(deviceLanguage);

/** Loads the language the user picked previously (if any). */
export async function loadSavedLanguage() {
  const saved = supported(await storage.get(KEY));
  if (saved && saved !== i18n.language) {
    await i18n.changeLanguage(saved);
    applyDirection(saved);
  }
}

export async function setLanguage(code: LanguageCode) {
  await storage.set(KEY, code);
  await i18n.changeLanguage(code);
  applyDirection(code);
}

export const currentLanguage = () => (supported(i18n.language) ?? 'en') as LanguageCode;

export function errorMessage(err: unknown): string {
  const code = (err as { code?: string; message?: string })?.code ?? (err as Error)?.message ?? 'generic';
  const key = `errors.${code}`;
  return i18n.exists(key) ? i18n.t(key) : i18n.t('errors.generic');
}

export default i18n;
