"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { buttonStyles } from "@/components/ui/Button";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <button
      type="button"
      className={buttonStyles({
        variant: "ghost",
        size: "sm",
        className: `min-w-14 ${className ?? ""}`.trim()
      })}
      onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
      title={locale === "ko" ? "English" : "한국어"}
    >
      {locale === "ko" ? "EN" : "KO"}
    </button>
  );
}
