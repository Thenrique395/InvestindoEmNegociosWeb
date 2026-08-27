export type LocaleSettings = {
  locale: string;
  currency: string;
};

export const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

const defaultSettings: LocaleSettings = {
  locale: 'pt-BR',
  currency: 'BRL'
};

let currentSettings: LocaleSettings = { ...defaultSettings };

export const getLocaleSettings = (): LocaleSettings => currentSettings;

export const setLocaleSettings = (next: Partial<LocaleSettings>): LocaleSettings => {
  currentSettings = { ...currentSettings, ...next };
  return currentSettings;
};

export const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return defaultSettings.locale;
  return window.localStorage.getItem('app_locale') || defaultSettings.locale;
};

export const getInitialCurrency = (): string => {
  if (typeof window === 'undefined') return defaultSettings.currency;
  return window.localStorage.getItem('app_currency') || defaultSettings.currency;
};

export const persistLocaleSettings = (locale: string, currency: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('app_locale', locale);
  window.localStorage.setItem('app_currency', currency);
};
