"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { gtagEvent } from "@/lib/analytics";

export default function AnalyticsQueryEvents() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.get("signup_success") === "1") {
      gtagEvent("signup");
      params.delete("signup_success");
      changed = true;
    }

    // payment_success=1 (기존) 또는 billing=success (Paddle 결제 복귀) 둘 다 결제 완료로 집계한다.
    if (params.get("payment_success") === "1" || params.get("billing") === "success") {
      const value = Number(params.get("value") ?? "0");
      const currency = params.get("currency") ?? "KRW";
      const transactionId = params.get("transaction_id") ?? undefined;
      gtagEvent("payment", {
        value: Number.isFinite(value) ? value : 0,
        currency,
        transaction_id: transactionId
      });
      params.delete("payment_success");
      // billing=success 도 지워 새로고침 시 중복 집계를 막는다 (replaceState 는
      // useSearchParams 를 다시 렌더하지 않으므로 현재 화면의 성공 배너는 유지된다).
      if (params.get("billing") === "success") params.delete("billing");
      params.delete("value");
      params.delete("currency");
      params.delete("transaction_id");
      changed = true;
    }

    if (!changed) return;
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, [searchParams]);

  return null;
}
