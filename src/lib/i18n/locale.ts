/** Removable i18n: locale persistence (mirrors theme-toggle). */

export type Locale = "en" | "zh";

export const LOCALE_STORAGE_KEY = "geo-radar-locale";
export const LOCALE_CHANGE_EVENT = "geo-radar-locale-change";
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "zh";
}

export function applyLocale(locale: Locale) {
  document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  document.documentElement.setAttribute("data-locale", locale);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

export function readLocale(): Locale {
  const attr = document.documentElement.getAttribute("data-locale");
  if (isLocale(attr)) return attr;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) return stored;
  return DEFAULT_LOCALE;
}

export function subscribeLocale(onStoreChange: () => void) {
  const onChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === LOCALE_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener(LOCALE_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LOCALE_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
