"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale, Dictionary } from "./types";
import ko from "./ko";
import en from "./en";

const dictionaries: Record<Locale, Dictionary> = { ko, en };

// The language switcher is hidden for now: EN only translates the marketing home + shared
// content, while app chrome/dashboard are still Korean-only, so a half-translated UI is worse
// than none. While disabled we force Korean and ignore any stored `en` cookie so users who
// toggled earlier aren't stranded. Re-enable by flipping this to true.
export const LOCALE_SWITCHER_ENABLED = false;

const COOKIE_NAME = "rb_locale";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function getStoredLocale(): Locale {
  if (typeof document === "undefined") return "ko";
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
  const value = match?.[1];
  if (value === "en" || value === "ko") return value;
  return "ko";
}

function setStoredLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "ko",
  setLocale: () => {},
  t: (key) => key
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ko");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(LOCALE_SWITCHER_ENABLED ? getStoredLocale() : "ko");
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setStoredLocale(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = dictionaries[locale] ?? dictionaries.ko;
      let value = dict[key] ?? dictionaries.ko[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [locale]
  );

  // Update html lang attribute
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslation() {
  const { t, locale } = useContext(I18nContext);
  return { t, locale };
}
