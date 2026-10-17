"use client";

import { getCheckoutAnalytics } from "@/lib/checkout-analytics";
import { extensionProduct } from "@/lib/extension-content";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { requestExtension } from "@/lib/extensionBridge";
import { getErrorMessage } from "@/types/common";
import PaddleCheckoutOverlay from "./PaddleCheckoutOverlay";
import ExtensionCustomerSurvey from "./ExtensionCustomerSurvey";

type UsageStatus = {
  authenticated: boolean;
  tier: "free" | "paid" | "anonymous";
  day: string;
  /** null = 무제한(유료 플랜). */
  limit: number | null;
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
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [recoveryRequested, setRecoveryRequested] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const recoveringPayment = billing === "success" || params.get("payment_return") === "1" || recoveryRequested;

  // Claim before offering checkout. A guest payment webhook may arrive after
  // the return page, so retry for up to one minute only during payment recovery.
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    setCheckingSubscription(true);
    setStatusError(null);
    const deadline = setTimeout(() => {
      controller.abort();
      clearTimeout(timer);
      setCheckingSubscription(false);
      setStatusError("구독 확인 시간이 초과되었습니다. 결제에 사용한 이메일인지 확인한 뒤 다시 시도해주세요.");
    }, 60_000);

    async function readStatus(): Promise<UsageStatus> {
      const res = await fetch("/api/extension/usage", { cache: "no-store", signal: controller.signal });
      if (!res.ok) throw new Error("사용량을 불러오지 못했습니다.");
      return res.json() as Promise<UsageStatus>;
    }

    async function checkSubscription() {
      attempts += 1;
      try {
        let next = await readStatus();
        if (next.authenticated && next.tier !== "paid") {
          const claim = await fetch("/api/billing/claim", { method: "POST", signal: controller.signal });
          if (!claim.ok) throw new Error("구독을 연결하지 못했습니다. 잠시 후 다시 확인해주세요.");
          next = await readStatus();
        }
        if (controller.signal.aborted) return;
        setStatus(next);
        if (recoveringPayment && next.authenticated && next.tier !== "paid" && attempts < 12) {
          timer = setTimeout(() => void checkSubscription(), 5000);
          return;
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setStatusError(getErrorMessage(err));
      }
      clearTimeout(deadline);
      setCheckingSubscription(false);
    }

    void checkSubscription();
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
    };
  }, [recoveringPayment, refreshVersion]);

  const retrySubscription = () => {
    setCheckingSubscription(true);
    setRecoveryRequested(true);
    setRefreshVersion((version) => version + 1);
  };

  const connectExtension = useCallback(async () => {
    if (!extId) return;
    setConnect("connecting");
    setConnectError(null);
    try {
      const res = await fetch("/api/extension/token", { method: "POST" });
      if (res.status === 401) throw new Error("로그인이 필요합니다.");
      if (!res.ok) throw new Error("토큰 발급에 실패했습니다.");
      const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: number };
      const result = await requestExtension(extId, "AUTH_TOKEN", { token, expiresAt });
      if (!result.ok) {
        setConnect("failed");
        setConnectError("익스텐션에 연결하지 못했습니다. 익스텐션이 설치되어 있는지 확인해주세요.");
      } else {
        setConnect("connected");
      }
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

  // 결제: 오버레이(현재 페이지 위 결제창) 우선. 별도 페이지 이동 결제는 링크로만 제공.
  const startCheckoutRedirect = useCallback(async () => {
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "extension", mode: "redirect", analytics: await getCheckoutAnalytics() })
      });
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
  }, []);

  const loginQuery = params.toString();
  const loginNext = `/extension-connect${loginQuery ? `?${loginQuery}` : ""}`;

  return (
    <main className="pageMain" style={{ padding: "48px 16px 64px" }}>
      <div className="mx-auto w-full" style={{ maxWidth: 560 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>익스텐션 계정 연결</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>
          ReviewBoost 리뷰 수집기를 계정과 연결하면 수집 한도가 계정 기준으로 관리됩니다.
        </p>

        {recoveringPayment ? (
          <div className="card" role="status" style={{ padding: 16, marginBottom: 16 }}>
            {status?.tier === "paid" ? (
              <>✅ 유료 구독이 확인되었습니다. 익스텐션 팝업을 다시 열어 이용해주세요.</>
            ) : status?.authenticated ? (
              <>
                {checkingSubscription ? "결제한 구독을 계정에 연결하고 있습니다. 최대 1분 정도 걸릴 수 있어요." : "아직 이 계정에서 유료 구독이 확인되지 않았습니다."}{" "}
                <strong>다시 결제하지 마세요.</strong> 결제에 사용한 이메일로 로그인했는지 확인해주세요.
              </>
            ) : (
              <>
                <strong>결제에 사용한 이메일로 로그인해 구독을 연결해주세요.</strong> 다시 결제할 필요는 없습니다.
              </>
            )}
          </div>
        ) : null}

        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          {status === null && !statusError ? <p>상태 확인 중…</p> : null}
          {statusError ? <p role="alert" style={{ color: "#c0392b" }}>{statusError}</p> : null}
          {!checkingSubscription && (statusError || (recoveringPayment && status?.authenticated && status.tier !== "paid")) ? (
            <div style={{ marginBottom: 12 }}>
              <button className="btn" onClick={retrySubscription}>구독 다시 확인</button>{" "}
              <Link className="btn" href="/support">결제 연결 문의하기</Link>
            </div>
          ) : null}

          {status && !status.authenticated ? (
            <>
              {!recoveringPayment && !checkingSubscription ? (
                <>
                  <p style={{ marginBottom: 8 }}>
                    로그인 없이도 <strong>이메일만으로 바로 결제</strong>할 수 있어요.
                  </p>
                  <p style={{ marginBottom: 12, opacity: 0.8, fontSize: 13 }}>
                    결제 후 같은 이메일로 로그인하면 구독이 자동으로 연결됩니다.
                  </p>
                  <ExtensionCheckoutSummary />
                </>
              ) : null}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ opacity: 0.6, fontSize: 13 }}>이미 계정이 있나요?</span>
                <Link className="btn" href={`/login?next=${encodeURIComponent(loginNext)}`}>
                  로그인하고 연결하기
                </Link>
              </div>
            </>
          ) : null}

          {status?.authenticated ? (
            <>
              <p style={{ marginBottom: 4 }}>
                현재 플랜: <strong>{status.tier === "paid" ? "익스텐션 유료 (무제한)" : "무료 (하루 50개)"}</strong>
              </p>
              {status.tier === "paid" ? (
                <p style={{ marginBottom: 12, opacity: 0.8 }}>오늘 수집: 무제한</p>
              ) : status.used !== null && status.limit !== null ? (
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

              {status.tier !== "paid" && !recoveringPayment && !checkingSubscription && !statusError ? (
                <div>
                  <ExtensionCheckoutSummary />
                  <p style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>
                    <button
                      className="btn"
                      disabled={checkoutBusy}
                      onClick={() => void startCheckoutRedirect()}
                      style={{ padding: "2px 8px", fontSize: 12 }}
                    >
                      {checkoutBusy ? "연결 중…" : "페이지 이동 결제 (대체 방법)"}
                    </button>
                  </p>
                  {checkoutError ? <p style={{ color: "#c0392b", marginTop: 8 }}>{checkoutError}</p> : null}
                  <button className="btn" onClick={retrySubscription} style={{ marginTop: 8 }}>
                    이미 결제했다면 구독 연결 확인
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <section aria-labelledby="subscription-help" className="card mb-4 space-y-3 p-5">
          <h2 id="subscription-help" className="text-balance text-base font-semibold">구독 관리 및 해지</h2>
          <p className="text-pretty text-sm leading-6">
            다음 정기결제일 전에 구독을 취소하면 추가 결제되지 않으며, 이미 결제한 이용 기간까지 사용할 수 있습니다.
          </p>
          <p className="text-pretty text-sm leading-6">
            Paddle 결제 확인 이메일의 ‘Manage subscription(구독 관리)’에서 관리하거나,
            아래 Paddle 고객지원에서 결제에 사용한 이메일로 구독을 찾아 해지를 요청하세요.
          </p>
          <a className="btn" href="https://paddle.net/contact">구독 관리 / 해지 — Paddle 고객지원</a>
        </section>

        {status?.authenticated && status.tier === "paid" && connect === "connected" ? <ExtensionCustomerSurvey /> : null}

        <p style={{ fontSize: 13, opacity: 0.7 }}>
          로그인 없이도 하루 50개까지는 무료로 수집할 수 있습니다. 더 많은 리뷰가 필요할 때만 구독하세요.
        </p>
      </div>
    </main>
  );
}

function ExtensionCheckoutSummary() {
  const price = extensionProduct.monthlyPrice.toLocaleString("ko-KR");
  return (
    <div className="space-y-3">
      <p className="text-pretty font-semibold tabular-nums">오늘 {price}원 결제 · 부가세 포함</p>
      <p className="text-pretty text-sm leading-6">
        오늘 결제하면 바로 이용할 수 있습니다. 결제에 사용한 이메일로 로그인하고 익스텐션을 연결해주세요.
      </p>
      <p className="text-pretty text-sm leading-6">
        이후 매월 자동결제됩니다. 결제창의 미래 날짜는 첫 결제일이 아닌 다음 정기결제일입니다.
        다음 결제일 전에 언제든 해지할 수 있습니다.
      </p>
      <PaddleCheckoutOverlay plan="extension" label={`월 ${price}원 구독하기`} />
    </div>
  );
}
