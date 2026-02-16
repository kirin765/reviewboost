"use client";

import { useMemo, useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";

type Props = {
  plan: "basic" | "pro";
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
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(json?.error ?? "결제 연결에 실패했습니다."));
      }

      const url = String(json?.url ?? "").trim();
      if (!url) throw new Error("결제 페이지 URL을 받지 못했습니다.");
      window.location.href = url;
    } catch (e: any) {
      const msg = String(e?.message ?? "결제 연결 중 오류가 발생했습니다.").trim();
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
