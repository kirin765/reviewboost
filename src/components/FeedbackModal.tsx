"use client";

import { useEffect, useState } from "react";

type Tone = "info" | "error";

export default function FeedbackModal(props: {
  title: string;
  message: string;
  tone?: Tone;
  onClose?: () => void;
}) {
  const { title, message, tone = "info", onClose } = props;
  const [open, setOpen] = useState(false);

  // message가 있을 때 항상 열기 (message가 변경되면 상태 초기화)
  useEffect(() => {
    if (message) {
      setOpen(true);
    }
  }, [message]);

  if (!open || !message) return null;

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal feedbackModal ${tone === "error" ? "feedbackModalError" : "feedbackModalInfo"}`}>
        <div className="modalHeader">
          <div>
            <div className="muted">안내</div>
            <div className="feedbackModalTitle">{title}</div>
          </div>
          <button type="button" className="btn btnSmall" onClick={() => { setOpen(false); onClose?.(); }}>
            닫기
          </button>
        </div>
        <div className="modalBody" style={{ whiteSpace: "pre-wrap" }}>
          {message}
        </div>
      </div>
      <button type="button" className="modalBackdrop" aria-label="닫기" onClick={() => { setOpen(false); onClose?.(); }} />
    </div>
  );
}
