"use client";

import { useSyncExternalStore } from "react";
import {
  applyLocale,
  DEFAULT_LOCALE,
  readLocale,
  subscribeLocale,
  type Locale,
} from "@/lib/i18n/locale";
import { messages, type Messages } from "@/lib/i18n/messages";

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, readLocale, getServerSnapshot);
}

export function useI18n(): {
  locale: Locale;
  m: Messages;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
} {
  const locale = useLocale();
  return {
    locale,
    m: messages[locale],
    setLocale: applyLocale,
    toggleLocale: () => applyLocale(locale === "en" ? "zh" : "en"),
  };
}
