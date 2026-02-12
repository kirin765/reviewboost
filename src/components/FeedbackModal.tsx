"use client";

import { useMemo, useState } from "react";

type Tone = "info" | "error";

export default function FeedbackModal(props: {
  title: string;
  message: string;
  tone?: Tone;
  onClose?: () => void;
}) {
  const { title, message, tone = "info", onClose } = props;
  const [open, setOpen] = useState(true);

  const toneClass = useMemo(() => (tone === "error" ? "feedbackModalError" : "feedbackModalInfo"), [tone]);

  if (!open || !message) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal feedbackModal ${toneClass}`}>
        <div className="modalHeader">
          <div>
            <div className="muted">안내</div>
            <div className="feedbackModalTitle">{title}</div>
          </div>
          <button
            type="button"
            className="btn btnSmall"
            onClick={() => {
              setOpen(false);
              onClose?.();
            }}
          >
            닫기
          </button>
        </div>
        <div className="modalBody" style={{ whiteSpace: "pre-wrap" }}>
          {message}
        </div>
      </div>
      <button
        type="button"
        className="modalBackdrop"
        aria-label="닫기"
        onClick={() => {
          setOpen(false);
          onClose?.();
        }}
      />
    </div>
  );
}
