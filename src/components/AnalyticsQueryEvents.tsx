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

    if (params.get("payment_success") === "1") {
      const value = Number(params.get("value") ?? "0");
      const currency = params.get("currency") ?? "KRW";
      const transactionId = params.get("transaction_id") ?? undefined;
      gtagEvent("payment", {
        value: Number.isFinite(value) ? value : 0,
        currency,
        transaction_id: transactionId
      });
      params.delete("payment_success");
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
