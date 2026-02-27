"use client";

import React, { useEffect, useState } from "react";

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

  // 메시지/제목/톤이 바뀌면 모달 표시 상태를 재동기화해서
  // 동일한 컴포넌트 인스턴스에서도 다시 열릴 수 있게 한다.
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
            <div className="muted">안내</div>
            <div className="feedbackModalTitle">{title}</div>
          </div>
          <button
            type="button"
            className="btn btnSmall"
            aria-label="안내 닫기"
            onClick={handleClose}
          >
            닫기
          </button>
        </div>
        <div className="modalBody" style={{ whiteSpace: "pre-wrap" }}>
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
      <button type="button" className="modalBackdrop" aria-label="닫기" onClick={handleClose} />
    </div>
  );
}
