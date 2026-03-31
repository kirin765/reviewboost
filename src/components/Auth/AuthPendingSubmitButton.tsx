"use client";

import React from "react";
import { useFormStatus } from "react-dom";

type AuthPendingSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
};

export default function AuthPendingSubmitButton({
  idleLabel,
  pendingLabel,
  className
}: AuthPendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonClassName = `btn btnPrimary formSubmit ${pending ? "btnLoading" : ""} ${className ?? ""}`.trim();

  return (
    <button className={buttonClassName} type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}
