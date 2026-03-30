"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";

type Tone = "info" | "error";

type FeedbackAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

export default function FeedbackModal(props: {
  title: string;
  message: string;
  tone?: Tone;
  onClose?: () => void;
  actions?: FeedbackAction[];
}) {
  const { title, message, tone = "info", onClose, actions } = props;
  const [open, setOpen] = useState(Boolean(message));
  const { t } = useTranslation();

  useEffect(() => {
    setOpen(Boolean(message));
  }, [title, message, tone]);

  if (!open || !message) return null;

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-live="polite"
    >
      <div
        className={`relative z-10 w-full max-w-xl rounded-[16px] border px-6 py-5 shadow-2xl backdrop-blur-xl ${
          tone === "error"
            ? "border-[color:var(--color-danger)]/40 bg-[rgba(42,19,18,0.96)]"
            : "border-white/10 bg-[rgba(17,20,23,0.96)]"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{t("modal.notice")}</div>
            <div className="mt-2 text-xl font-semibold text-[var(--color-text)]">{title}</div>
          </div>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-[12px] border border-white/10 px-3 text-xs text-[var(--color-text)] transition hover:bg-white/[0.06]"
            aria-label={t("modal.closeNotice")}
            onClick={handleClose}
          >
            {t("modal.close")}
          </button>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-text)]/88">{message}</div>
        {actions?.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className={
                  action.variant === "primary"
                    ? "inline-flex items-center justify-center rounded-[12px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                    : "inline-flex items-center justify-center rounded-[12px] border border-white/10 px-4 py-2 text-sm text-[var(--color-text)]"
                }
                onClick={() => {
                  action.onClick();
                  handleClose();
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="absolute inset-0" aria-label={t("modal.close")} onClick={handleClose} />
    </div>
  );
}
