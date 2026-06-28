"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

type Status = "idle" | "loading" | "done" | "error";

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    let message = "요청에 실패했습니다.";
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data?.error?.message) message = data.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export default function FreeReportClient() {
  const router = useRouter();
  const params = useSearchParams();
  const urlParam = params.get("url")?.trim() ?? "";

  const [input, setInput] = useState(urlParam);
  const [status, setStatus] = useState<Status>(urlParam ? "loading" : "idle");
  const [result, setResult] = useState<DashboardAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gateOpen, setGateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const startedFor = useRef<string | null>(null);

  const runAnalysis = useCallback(async (productUrl: string) => {
    setStatus("loading");
    setError(null);
    setResult(null);
    try {
      const payload = (await postJson("/api/free-report", { productUrl })) as DashboardAnalysisResult;
      setResult(payload);
      setStatus("done");
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!urlParam || startedFor.current === urlParam) return;
    startedFor.current = urlParam;
    void runAnalysis(urlParam);
  }, [urlParam, runAnalysis]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    router.push(`/free-report?url=${encodeURIComponent(v)}`);
  };

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
      await postJson("/api/free-report/lead", { email: v, productUrl: urlParam });
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
              headerDescription="쿠팡 상품 URL로 만든 무료 리포트입니다. PDF로 저장하려면 이메일만 입력하세요."
              secondaryHref="/signup"
              secondaryLabel="가입하고 저장"
            />
          </PlanProvider>
          <CrossPromo className="mt-8" />
        </div>

        {gateOpen ? (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(31,37,89,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
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
              <p className="mt-3 text-center text-xs text-[var(--rb-muted)]">
                계정을 만들면 리포트가 대시보드에 저장됩니다.{" "}
                <Link href="/signup" className="text-[var(--rb-accent)]">가입하기</Link>
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
        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">무료 리뷰 리포트</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--rb-fg)]">
          쿠팡 상품 URL만 넣으면<br />부정 키워드 TOP과 개선안을 무료로
        </h1>
        <p className="mt-4 text-base leading-8 text-[var(--rb-muted-strong)]">
          상품 상세 URL을 붙여넣으면 리뷰를 모아 감정·카테고리·우선순위까지 분석해 드립니다. 회원가입 없이 바로 확인하세요.
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            type="url"
            inputMode="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://www.coupang.com/vp/products/..."
            className="input"
            disabled={status === "loading"}
          />
          <button type="submit" className="btn btnPrimary" disabled={status === "loading" || !input.trim()}>
            무료 분석
          </button>
        </form>

        {status === "loading" ? (
          <div className="mt-8 rounded-[16px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] p-5">
            <div className="loadingBar"><div className="loadingBarFill" /></div>
            <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
              리뷰를 수집하고 분석하는 중입니다… 최대 1~2분 정도 걸릴 수 있어요. 페이지를 닫지 말고 잠시만 기다려 주세요.
            </p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="mt-8 rounded-[16px] border border-[color:rgba(255,122,102,0.28)] bg-[rgba(255,122,102,0.10)] p-5">
            <p className="text-sm font-medium text-[#993c1d]">분석에 실패했습니다</p>
            <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">{error}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn btnSmall" onClick={() => urlParam && runAnalysis(urlParam)}>
                다시 시도
              </button>
              <Link href="/dashboard/analyze" className="btn btnSmall">
                CSV로 직접 분석하기
              </Link>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-xs leading-6 text-[var(--rb-muted)]">
          현재 쿠팡 상품 URL을 지원합니다. 스마트스토어 등 다른 스토어는 CSV 업로드로 분석할 수 있어요.
        </p>
      </div>
    </main>
  );
}
