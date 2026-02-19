"use client";

import React, { useMemo, useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";

type Props = {
  plan: "basic" | "pro";
  priceId?: string;
  userId?: string;
  userEmail?: string;
};

export default function PricingActions({ plan, priceId, userId, userEmail }: Props) {
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
      const trimmedPriceId = String(priceId ?? "").trim();
      if (!trimmedPriceId.startsWith("pri_")) {
        throw new Error("요금제 가격 ID가 아직 설정되지 않았습니다.");
      }

      if (!userId) {
        throw new Error("로그인이 필요합니다.");
      }

      const checkoutOpen = (window as Window & {
        Paddle?: {
          Checkout?: {
            open: (options: {
              items: Array<{ priceId: string; quantity: number }>;
              customData?: { user_id: string; plan_tier: string };
              customer?: { email: string };
              settings?: { successUrl: string};
            }) => void;
          };
        };
      }).Paddle?.Checkout?.open;
      if (typeof checkoutOpen !== "function") {
        throw new Error("Paddle 결제 모듈이 아직 준비되지 않았습니다.");
      }

      const origin = window.location.origin;
      const buildCallbackUrl = (type: "success" | "cancel") =>
        `${origin}/pricing?billing=${type}&plan=${plan}`;

      checkoutOpen({
        items: [{ priceId: trimmedPriceId, quantity: 1 }],
        customData: {
          user_id: userId,
          plan_tier: plan
        },
        ...(userEmail ? { customer: { email: userEmail } } : {}),
        settings: {
          successUrl: buildCallbackUrl("success")
        }
      });
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
