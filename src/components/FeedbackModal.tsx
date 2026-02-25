"use client";

import React, { useEffect, useState } from "react";

type Tone = "info" | "error";

export default function FeedbackModal(props: {
  title: string;
  message: string;
  tone?: Tone;
  onClose?: () => void;
}) {
  const { title, message, tone = "info", onClose } = props;
  const [open, setOpen] = useState(Boolean(message));

  // 메시지/제목/톤이 바뀌면 모달 표시 상태를 재동기화해서
  // 동일한 컴포넌트 인스턴스에서도 다시 열릴 수 있게 한다.
  useEffect(() => {
    setOpen(Boolean(message));
  }, [title, message, tone]);

  if (!open || !message) return null;

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
            <div className="muted">안내</div>
            <div className="feedbackModalTitle">{title}</div>
          </div>
          <button
            type="button"
            className="btn btnSmall"
            aria-label="안내 닫기"
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
      <button type="button" className="modalBackdrop" aria-label="닫기" onClick={() => { setOpen(false); onClose?.(); }} />
    </div>
  );
}
