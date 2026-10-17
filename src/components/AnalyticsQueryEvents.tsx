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

    // A return URL is navigation, not proof of payment. Revenue comes from signed webhooks.
    if (params.get("payment_success") === "1" || params.get("billing") === "success") {
      gtagEvent("checkout_return");
      params.delete("payment_success");
      // Next updates useSearchParams after replaceState. Keep a non-analytics
      // recovery flag across refresh/login so a paid guest is not offered checkout again.
      if (window.location.pathname === "/extension-connect") {
        params.set("payment_return", "1");
        params.delete("checkout");
      }
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
