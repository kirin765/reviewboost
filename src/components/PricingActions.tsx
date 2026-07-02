"use client";

import React, { useMemo, useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";
import { getErrorMessage } from "@/types/common";

type Props = {
  plan: "basic" | "pro";
};

type CheckoutResponse = {
  url?: string;
  error?: string;
};

export default function PricingActions({ plan }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText = useMemo(() => (plan === "pro" ? "Pro 시작하기" : "Basic 시작하기"), [plan]);

  function handleErrorClose() {
    setError(null);
  }

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ plan })
      });

      let payload: CheckoutResponse | null = null;
      try {
        payload = await response.json() as CheckoutResponse;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(String(payload?.error || "결제 세션 생성 중 오류가 발생했습니다."));
      }

      const checkoutUrl = String(payload?.url ?? "").trim();
      if (!checkoutUrl) {
        throw new Error("결제 세션 생성에 실패했습니다.");
      }

      window.location.assign(checkoutUrl);
    } catch (error: unknown) {
      const msg = String(getErrorMessage(error) || "결제 연결 중 오류가 발생했습니다.").trim();
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <FeedbackModal title="결제 오류" message={error} tone="error" onClose={handleErrorClose} /> : null}
      <div className="actionRow">
        <button className="btn btnPrimary" disabled={busy} onClick={startCheckout}>
          {busy ? "연결 중..." : buttonText}
        </button>
      </div>
    </>
  );
}
