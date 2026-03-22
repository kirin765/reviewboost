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
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-live="polite"
    >
      <div className={`modal feedbackModal ${tone === "error" ? "feedbackModalError" : "feedbackModalInfo"}`}>
        <div className="modalHeader">
          <div>
            <div className="muted">{t("modal.notice")}</div>
            <div className="feedbackModalTitle">{title}</div>
          </div>
          <button
            type="button"
            className="btn btnSmall"
            aria-label={t("modal.closeNotice")}
            onClick={handleClose}
          >
            {t("modal.close")}
          </button>
        </div>
        <div className="modalBody modalBodyPreWrap">
          {message}
        </div>
        {actions?.length ? (
          <div className="modalFooter">
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className={`btn ${action.variant === "primary" ? "btnPrimary" : ""} btnSmall`}
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
      <button type="button" className="modalBackdrop" aria-label={t("modal.close")} onClick={handleClose} />
    </div>
  );
}
