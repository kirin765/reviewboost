"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <button
      type="button"
      className={`langSwitcher ${className ?? ""}`}
      onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
      aria-label={locale === "ko" ? "Switch to English" : "한국어로 전환"}
      title={locale === "ko" ? "English" : "한국어"}
    >
      <span className="langSwitcherIcon" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="18" height="18">
          <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="10" cy="10" rx="4" ry="8.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      <span className="langSwitcherLabel">{locale === "ko" ? "EN" : "KO"}</span>
    </button>
  );
}
