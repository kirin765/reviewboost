"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getErrorMessage } from "@/types/common";

type ChromeRuntime = {
  runtime?: {
    sendMessage?: (extensionId: string, message: unknown, cb: (response: unknown) => void) => void;
    lastError?: { message?: string };
  };
};

type UsageStatus = {
  authenticated: boolean;
  tier: "free" | "paid" | "anonymous";
  day: string;
  limit: number;
  used: number | null;
  remaining: number | null;
};

type ConnectState = "idle" | "connecting" | "connected" | "failed";

export default function ExtensionConnectClient() {
  const params = useSearchParams();
  const extId = params.get("ext");
  const billing = params.get("billing");

  const [status, setStatus] = useState<UsageStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [connect, setConnect] = useState<ConnectState>("idle");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/extension/usage", { cache: "no-store" });
      if (!res.ok) throw new Error("사용량을 불러오지 못했습니다.");
      setStatus((await res.json()) as UsageStatus);
      setStatusError(null);
    } catch (err) {
      setStatusError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const connectExtension = useCallback(async () => {
    if (!extId) return;
    const chrome = (window as unknown as { chrome?: ChromeRuntime }).chrome;
    const sendMessage = chrome?.runtime?.sendMessage;
    if (!sendMessage) {
      setConnect("failed");
      setConnectError("Chrome 브라우저에서 익스텐션이 설치된 상태로 열어주세요.");
      return;
    }
    setConnect("connecting");
    setConnectError(null);
    try {
      const res = await fetch("/api/extension/token", { method: "POST" });
      if (res.status === 401) throw new Error("로그인이 필요합니다.");
      if (!res.ok) throw new Error("토큰 발급에 실패했습니다.");
      const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: number };
      sendMessage(extId, { type: "AUTH_TOKEN", token, expiresAt }, (response) => {
        const ok = Boolean((response as { ok?: boolean } | undefined)?.ok);
        if (chrome?.runtime?.lastError || !ok) {
          setConnect("failed");
          setConnectError("익스텐션에 연결하지 못했습니다. 익스텐션이 설치되어 있는지 확인해주세요.");
        } else {
          setConnect("connected");
        }
      });
    } catch (err) {
      setConnect("failed");
      setConnectError(getErrorMessage(err));
    }
  }, [extId]);

  useEffect(() => {
    if (status?.authenticated && extId && connect === "idle") {
      void connectExtension();
    }
  }, [status, extId, connect, connectExtension]);

  async function startCheckout() {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "extension" })
      });
      if (res.status === 401) throw new Error("로그인이 필요합니다.");
      const payload = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok) throw new Error(String(payload?.error || "결제 세션 생성 중 오류가 발생했습니다."));
      const url = String(payload?.url ?? "").trim();
      if (!url) throw new Error("결제 세션 생성에 실패했습니다.");
      window.location.assign(url);
    } catch (err) {
      setCheckoutError(getErrorMessage(err));
    } finally {
      setCheckoutBusy(false);
    }
  }

  const loginNext = `/extension-connect${extId ? `?ext=${encodeURIComponent(extId)}` : ""}`;

  return (
    <main className="pageMain" style={{ padding: "48px 16px 64px" }}>
      <div className="mx-auto w-full" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>익스텐션 계정 연결</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>
          ReviewBoost 리뷰 수집기를 계정과 연결하면 수집 한도가 계정 기준으로 관리됩니다.
        </p>

        {billing === "success" ? (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            ✅ 구독이 완료되었습니다. 결제 반영까지 최대 1분 정도 걸릴 수 있어요. 익스텐션 팝업을 다시 열면
            늘어난 한도가 적용됩니다.
          </div>
        ) : null}

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          {status === null && !statusError ? <p>상태 확인 중…</p> : null}
          {statusError ? <p style={{ color: "#c0392b" }}>{statusError}</p> : null}

          {status && !status.authenticated ? (
            <>
              <p style={{ marginBottom: 12 }}>계정 연결을 위해 먼저 로그인해주세요.</p>
              <Link className="btn btnPrimary" href={`/login?next=${encodeURIComponent(loginNext)}`}>
                로그인하고 연결하기
              </Link>
            </>
          ) : null}

          {status?.authenticated ? (
            <>
              <p style={{ marginBottom: 4 }}>
                현재 플랜: <strong>{status.tier === "paid" ? "익스텐션 유료 (하루 2,000개)" : "무료 (하루 50개)"}</strong>
              </p>
              {status.used !== null ? (
                <p style={{ marginBottom: 12, opacity: 0.8 }}>
                  오늘 수집: {status.used.toLocaleString()} / {status.limit.toLocaleString()}개
                </p>
              ) : null}

              {extId ? (
                <p style={{ marginBottom: 12 }}>
                  {connect === "connecting" ? "익스텐션 연결 중…" : null}
                  {connect === "connected" ? "✅ 익스텐션이 연결되었습니다. 팝업을 다시 열어 확인하세요." : null}
                  {connect === "failed" ? (
                    <>
                      ⚠ {connectError}{" "}
                      <button className="btn" onClick={() => void connectExtension()}>
                        다시 시도
                      </button>
                    </>
                  ) : null}
                </p>
              ) : (
                <p style={{ marginBottom: 12, opacity: 0.8 }}>
                  익스텐션 팝업의 <strong>계정 연결</strong> 버튼으로 이 페이지를 열면 자동으로 연결됩니다.
                </p>
              )}

              {status.tier !== "paid" ? (
                <div>
                  <button className="btn btnPrimary" disabled={checkoutBusy} onClick={() => void startCheckout()}>
                    {checkoutBusy ? "연결 중…" : "익스텐션 플랜 구독하기 — 하루 2,000개"}
                  </button>
                  {checkoutError ? <p style={{ color: "#c0392b", marginTop: 8 }}>{checkoutError}</p> : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <p style={{ fontSize: 13, opacity: 0.7 }}>
          로그인 없이도 하루 50개까지는 무료로 수집할 수 있습니다. 더 많은 리뷰가 필요할 때만 구독하세요.
        </p>
      </div>
    </main>
  );
}
