"use client";

import React from "react";
import { useEffect, useRef, useState } from "react";

async function copyToClipboard(text: string) {
  const t = String(text ?? "");
  try {
    await navigator.clipboard.writeText(t);
    return;
  } catch {
    // Fallback for older browsers / non-secure contexts.
  }

  const ta = document.createElement("textarea");
  ta.value = t;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const ok = document.execCommand("copy");
    if (!ok) throw new Error("execCommand(copy) failed");
  } finally {
    document.body.removeChild(ta);
  }
}

type CopyButtonProps = {
  text: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  copiedLabel?: string;
  errorLabel?: string;
  resetMs?: number;
};

export default function CopyButton({
  text,
  className = "btn btnSmall",
  ariaLabel,
  children = "복사",
  copiedLabel = "복사됨",
  errorLabel = "복사 실패",
  resetMs = 1200
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, []);

  async function onClick() {
    try {
      await copyToClipboard(text);
      setState("copied");
    } catch {
      setState("error");
    } finally {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setState("idle"), resetMs);
    }
  }

  const label = state === "copied" ? copiedLabel : state === "error" ? errorLabel : children;
  const toastMessage = state === "copied" ? copiedLabel : state === "error" ? errorLabel : null;

  return (
    <>
      <button className={className} onClick={onClick} aria-label={ariaLabel}>
        {label}
      </button>
      {toastMessage ? (
        <div className="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </>
  );
}
