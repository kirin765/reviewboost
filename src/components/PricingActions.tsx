"use client";

import React, { useMemo, useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";
import { paddleBrowserEnv } from "@/lib/paddle";

type Props = {
  plan: "basic" | "pro";
  priceId?: string;
  userId?: string;
  userEmail?: string;
};

type PaddleWindow = Window & {
  Paddle?: {
    Initialized?: boolean;
    Initialize?: (options: { token: string }) => void;
    Environment?: {
      set: (environment: "sandbox" | "production") => void;
    };
    Checkout?: {
      open: PaddleCheckoutOpen;
    };
  };
};

const PADDLE_READY_POLL_MS = 120;
const PADDLE_READY_TIMEOUT_MS = 2500;

type PaddleCheckoutOptions = {
  items: Array<{ priceId: string; quantity: number }>;
  customData?: { user_id: string; plan_tier: string };
  customer?: { email: string };
  settings?: { successUrl: string };
};

type PaddleCheckoutOpen = (options: PaddleCheckoutOptions) => void;

export default function PricingActions({ plan, priceId, userId, userEmail }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonText = useMemo(() => (plan === "pro" ? "Pro 시작하기" : "Basic 시작하기"), [plan]);

  function handleErrorClose() {
    setError(null);
  }

  function isPaddleInitialized(paddle: NonNullable<PaddleWindow["Paddle"]>): boolean {
    if (!Object.prototype.hasOwnProperty.call(paddle, "Initialized")) {
      return true;
    }
    return paddle.Initialized === true;
  }

  function getCheckoutOpen() {
    const paddle = (window as PaddleWindow).Paddle;

    if (!paddle) return null;
    if (!paddle.Checkout || typeof paddle.Checkout.open !== "function") return null;
    if (!isPaddleInitialized(paddle)) return null;
    return paddle.Checkout.open;
  }

  function getClientPaddleEnv(): "sandbox" | "production" {
    return paddleBrowserEnv() === "sandbox" ? "sandbox" : "production";
  }

  function getClientPaddleToken(): string | null {
    const env = getClientPaddleEnv();
    const sandboxToken = String(process.env.NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX ?? "").trim();
    const liveToken = String(process.env.NEXT_PUBLIC_PADDLE_TOKEN_LIVE ?? "").trim();
    const legacyToken = String(process.env.NEXT_PUBLIC_PADDLE_TOKEN ?? "").trim();

    if (env === "production" && liveToken) return liveToken;
    if (env === "sandbox" && sandboxToken) return sandboxToken;
    if (legacyToken) return legacyToken;
    return null;
  }

  function tryInitializePaddle() {
    const paddle = (window as PaddleWindow).Paddle;
    if (!paddle) return false;
    if (!paddle.Initialize || typeof paddle.Initialize !== "function") return false;
    const token = getClientPaddleToken();
    if (!token) return false;

    try {
      if (getClientPaddleEnv() === "sandbox") {
        paddle.Environment?.set?.("sandbox");
      }
      paddle.Initialize({ token });
      return true;
    } catch {
      return false;
    }
  }

  async function getCheckoutOpenWithRetry(): Promise<PaddleCheckoutOpen | null> {
    const deadline = Date.now() + PADDLE_READY_TIMEOUT_MS;
    while (Date.now() <= deadline) {
      const checkoutOpen = getCheckoutOpen();
      if (checkoutOpen) return checkoutOpen;

      const paddle = (window as PaddleWindow).Paddle;
      if (paddle && !isPaddleInitialized(paddle)) {
        tryInitializePaddle();
      }
      await new Promise((resolve) => setTimeout(resolve, PADDLE_READY_POLL_MS));
    }

    return null;
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

      const checkoutOpen = await getCheckoutOpenWithRetry();
      if (!checkoutOpen) {
        if (!getClientPaddleToken()) {
          throw new Error("Paddle 결제 토큰이 설정되지 않았습니다. 배포 환경 변수를 확인하세요.");
        }
        throw new Error("Paddle 결제 모듈이 아직 준비되지 않았습니다.");
      }

      const origin = window.location.origin;

      const callbackUrl = `${origin}/pricing?billing=success&plan=${plan}`;
      try {
        checkoutOpen({
          items: [{ priceId: trimmedPriceId, quantity: 1 }],
          customData: {
            user_id: userId,
            plan_tier: plan
          },
          ...(userEmail ? { customer: { email: userEmail } } : {}),
          settings: {
            successUrl: callbackUrl
          }
        });
      } catch (error) {
        const message = String((error as Error)?.message ?? "").toLowerCase();
        if (message.includes("checkoutfrontendbase")) {
          throw new Error("Paddle 결제 모듈이 아직 준비되지 않았습니다.");
        }
        throw error;
      }
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
