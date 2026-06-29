"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AnalysisResults from "@/components/features/dashboard/AnalysisResults";
import CrossPromo from "@/components/CrossPromo";
import { PlanProvider } from "@/contexts/PlanContext";
import { downloadReportPdf } from "@/lib/api/analysis";
import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import type { Capabilities } from "@/lib/capabilities";
import { getErrorMessage } from "@/types/common";

const FREE_CAPS: Capabilities = {
  databaseConfigured: false,
  authConfigured: true,
  openaiConfigured: false,
  plan: "free",
  planLabel: "무료",
  monthlyLimit: 100,
  monthlyUsed: 0,
  aiAdvancedAvailable: false
};

type Status = "loading" | "done" | "missing" | "error";

type ChromeRuntime = {
  runtime?: {
    sendMessage?: (extensionId: string, message: unknown, cb: (response: unknown) => void) => void;
    lastError?: { message?: string };
  };
};

type PullResponse = { ok: true; payload: DashboardAnalysisResult } | { ok: false };

function pullReport(extId: string): Promise<DashboardAnalysisResult | null> {
  const chromeApi = (window as unknown as { chrome?: ChromeRuntime }).chrome;
  const send = chromeApi?.runtime?.sendMessage;
  if (!send) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      send(extId, { type: "PULL_REPORT" }, (response: unknown) => {
        const resp = response as PullResponse | undefined;
        resolve(resp && resp.ok ? resp.payload : null);
      });
    } catch {
      resolve(null);
    }
  });
}

export default function ExtensionReportClient() {
  const params = useSearchParams();
  const extId = params.get("ext")?.trim() ?? "";

  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<DashboardAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gateOpen, setGateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const pulled = useRef(false);

  useEffect(() => {
    if (pulled.current) return;
    pulled.current = true;
    if (!extId) {
      setStatus("missing");
      return;
    }
    void pullReport(extId).then((payload) => {
      if (payload) {
        setResult(payload);
        setStatus("done");
      } else {
        setStatus("missing");
      }
    });
  }, [extId]);

  const triggerDownload = useCallback(async () => {
    if (!result) return;
    setPdfBusy(true);
    try {
      const blob = await downloadReportPdf(result);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "reviewboost-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setGateOpen(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setStatus("error");
    } finally {
      setPdfBusy(false);
    }
  }, [result]);

  const onGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }
    setError(null);
    try {
      await fetch("/api/free-report/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: v, productUrl: "extension" })
      });
    } catch {
      // lead capture is best-effort; never block the download
    }
    await triggerDownload();
  };

  if (status === "done" && result) {
    return (
      <main className="pageMain" style={{ padding: "24px 16px 64px" }}>
        <div className="mx-auto w-full max-w-[1100px]">
          <PlanProvider plan="free">
            <AnalysisResults
              result={result}
              caps={FREE_CAPS}
              busy={pdfBusy}
              onDownloadPdf={() => setGateOpen(true)}
              headerDescription="익스텐션으로 수집한 리뷰를 무료로 분석한 리포트입니다. PDF로 저장하려면 이메일만 입력하세요."
              secondaryHref="/signup"
              secondaryLabel="가입하고 저장"
            />
          </PlanProvider>
          <CrossPromo className="mt-8" />
        </div>

        {gateOpen ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: "rgba(31,37,89,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
            onClick={() => !pdfBusy && setGateOpen(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[420px] rounded-[20px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] p-6 shadow-[0_24px_60px_rgba(34,46,121,0.18)]"
            >
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">PDF로 저장하기</h2>
              <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">
                이메일을 입력하면 PDF 리포트를 바로 받을 수 있어요. 결과 업데이트와 개선 팁도 보내드립니다.
              </p>
              <form onSubmit={onGateSubmit} className="mt-4 grid gap-3">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input"
                />
                <button type="submit" disabled={pdfBusy} className="btn btnPrimary">
                  {pdfBusy ? "PDF 생성 중…" : "PDF 받기"}
                </button>
              </form>
              {error ? <p className="mt-3 text-center text-xs text-[#993c1d]">{error}</p> : null}
              <p className="mt-3 text-center text-xs text-[var(--rb-muted)]">
                계정을 만들면 리포트가 대시보드에 저장됩니다.{" "}
                <Link href="/signup" className="text-[var(--rb-accent)]">
                  가입하기
                </Link>
              </p>
            </div>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className="pageMain" style={{ padding: "48px 16px 64px" }}>
      <div className="mx-auto w-full max-w-[640px]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">익스텐션 분석 리포트</p>
        <h1 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[var(--rb-fg)]">
          {status === "loading" ? "리포트를 불러오는 중…" : "리포트를 찾지 못했습니다"}
        </h1>

        {status === "loading" ? (
          <div className="mt-8 rounded-[16px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] p-5">
            <div className="loadingBar">
              <div className="loadingBarFill" />
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
              ReviewBoost 리뷰 수집기 익스텐션에서 분석 결과를 가져오고 있습니다…
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-base leading-8 text-[var(--rb-muted-strong)]">
              이 페이지는 ReviewBoost 리뷰 수집기 익스텐션의 <strong>“ReviewBoost로 분석”</strong> 버튼으로
              열어야 결과가 표시됩니다. 익스텐션을 설치한 뒤 쿠팡·스마트스토어 상품 페이지에서 다시 시도해 주세요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/free-report" className="btn btnPrimary btnSmall">
                URL로 무료 분석
              </Link>
              <Link href="/dashboard/analyze" className="btn btnSmall">
                CSV로 분석하기
              </Link>
            </div>
          </>
        )}

        {error ? (
          <p className="mt-6 text-sm leading-7 text-[#993c1d]">{error}</p>
        ) : null}
      </div>
    </main>
  );
}
