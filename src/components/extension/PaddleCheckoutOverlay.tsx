"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Paddle Checkout Overlay 결제 버튼 — 별도 페이지 이동 없이 현재 페이지 위에
 * 결제창을 띄운다. 서버(/api/billing/checkout, mode=overlay)가 내려준
 * priceId/clientToken 으로 Paddle.js Checkout.open 을 호출한다.
 * 로그인하지 않아도(게스트) 사용 가능 — 이메일은 Paddle 이 수집하고,
 * 나중에 같은 이메일로 로그인하면 구독이 자동 연결된다.
 */

type OverlayConfig = {
  mode: "overlay";
  plan: string;
  priceId: string;
  clientToken: string | null;
  environment?: "sandbox" | "live";
  successUrl: string;
  email?: string | null;
  hasAccount: boolean;
  userId?: string | null;
};

type PaddleGlobal = {
  Initialize: (opts: { token: string; environment?: "sandbox" | "live" }) => void;
  Checkout: {
    open: (opts: {
      items?: Array<{ priceId: string; quantity: number }>;
      customData?: Record<string, unknown>;
      customer?: { email_address?: string };
      settings?: Record<string, unknown>;
    }) => void;
  };
};

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

export default function PaddleCheckoutOverlay({
  plan = "extension",
  label = "결제하기",
  busyLabel = "결제 준비 중…",
  className = "btn btnPrimary",
  autoOpen = false,
  onError
}: {
  plan?: "basic" | "pro" | "extension";
  label?: string;
  busyLabel?: string;
  className?: string;
  /** ?checkout=1 딥링크처럼 페이지 진입 즉시 결제창을 연다. */
  autoOpen?: boolean;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paddlePromise = useRef<Promise<void> | null>(null);
  const autoFired = useRef(false);

  const ensurePaddle = useCallback(() => {
    if (!paddlePromise.current) {
      paddlePromise.current = new Promise<void>((resolve, reject) => {
        if (window.Paddle) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
        document.head.appendChild(script);
      });
    }
    return paddlePromise.current;
  }, []);

  const open = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, mode: "overlay" })
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "결제 준비에 실패했습니다.");
      }
      const cfg = (await res.json()) as OverlayConfig;
      if (!cfg.priceId) throw new Error("요금제 가격이 설정되지 않았습니다.");
      if (!cfg.clientToken) throw new Error("결제 설정이 준비되지 않았습니다.");

      await ensurePaddle();
      window.Paddle?.Initialize({
        token: cfg.clientToken,
        ...(cfg.environment ? { environment: cfg.environment } : {})
      });
      window.Paddle?.Checkout.open({
        items: [{ priceId: cfg.priceId, quantity: 1 }],
        customData: {
          plan_tier: cfg.plan,
          ...(cfg.userId ? { user_id: cfg.userId } : {})
        },
        ...(cfg.email ? { customer: { email_address: cfg.email } } : {}),
        settings: {
          displayMode: "overlay",
          theme: "light",
          successUrl: cfg.successUrl,
          frameTarget: "_top"
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "결제 준비 중 오류가 발생했습니다.";
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }, [plan, ensurePaddle, onError]);

  // ?checkout=1 딥링크: 마운트 후 1회 자동으로 결제창을 연다.
  useEffect(() => {
    if (autoOpen && !autoFired.current) {
      autoFired.current = true;
      void open();
    }
  }, [autoOpen, open]);

  return (
    <div>
      <button className={className} disabled={busy} onClick={() => void open()}>
        {busy ? busyLabel : label}
      </button>
      {error ? (
        <p style={{ color: "#c0392b", marginTop: 8, fontSize: 13 }}>{error}</p>
      ) : null}
    </div>
  );
}
