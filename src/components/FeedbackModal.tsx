"use client";

import React, { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";

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

  useEffect(() => {
    setOpen(Boolean(message));
  }, [title, message, tone]);

  if (!open || !message) return null;

  function handleClose() {
    setOpen(false);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-5" role="dialog" aria-modal="true" aria-label={title} aria-live="polite">
      <button type="button" className="absolute inset-0 bg-[rgba(0,0,0,0.68)] backdrop-blur-sm" aria-label="닫기" onClick={handleClose} />
      <div
        className={`relative z-10 w-full max-w-xl rounded-[18px] border p-6 shadow-[0_28px_50px_rgba(0,0,0,0.38)] ${
          tone === "error"
            ? "border-[color:rgba(255,137,137,0.28)] bg-[rgba(24,10,10,0.96)]"
            : "border-[color:var(--rb-border)] bg-[rgba(11,15,16,0.96)]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{tone === "error" ? "오류" : "안내"}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{title}</h2>
          </div>
          <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={handleClose}>닫기</button>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--rb-muted-strong)]">{message}</p>
        {actions?.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={buttonStyles({ variant: action.variant === "primary" ? "primary" : "secondary", size: "sm" })}
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
    </div>
  );
}
