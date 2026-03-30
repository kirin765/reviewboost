"use client";

import { useCallback, useState } from "react";
import { downloadCoupangCsv } from "@/lib/api/coupang";
import { getErrorMessage } from "@/types/common";
import {
  Eyebrow,
  Panel,
  pageShellClass,
  primaryButtonClass
} from "@/components/marketing/MarketingPrimitives";

export default function CoupangCsvDownloadTool() {
  const [productUrl, setProductUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onDownload = useCallback(async () => {
    if (!productUrl.trim()) {
      setError("상품 URL을 입력해 주세요.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const { blob, filename } = await downloadCoupangCsv({ productUrl: productUrl.trim() });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("CSV 다운로드가 완료되었습니다.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [productUrl]);

  return (
    <section className={`${pageShellClass} pt-12`}>
      <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="max-w-[620px]">
          <Eyebrow>Review CSV</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl md:leading-[0.95]">
            상품 URL만 넣고
            <br />
            리뷰 CSV를 바로
            <br />
            가져옵니다
          </h1>
          <p className="mt-6 text-base leading-8 text-[var(--color-muted)]">
            쿠팡 또는 스마트스토어 상품 URL을 입력하면 분석에 바로 사용할 수 있는 CSV를 다운로드할 수 있습니다.
          </p>
        </div>

        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            {["URL 입력", "리뷰 수집", "CSV 다운로드"].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{item}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">분석 전 준비 시간을 줄이기 위한 빠른 수집 플로우입니다.</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mx-auto mt-14 max-w-[860px] p-6 md:p-8">
        <div className="text-sm uppercase tracking-[0.18em] text-white/42">Product URL</div>
        <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-white/[0.08] bg-[#f7f9fc] p-3 md:flex-row md:items-center">
          <input
            className="h-[52px] flex-1 rounded-[18px] bg-transparent px-4 text-base text-[#111111] outline-none placeholder:text-[#7d8590]"
            value={productUrl}
            onChange={(event) => setProductUrl(event.target.value)}
            placeholder="상품 URL을 입력하세요"
            disabled={busy}
          />
          <button
            type="button"
            className={`${primaryButtonClass} h-12 shrink-0 border-0`}
            onClick={onDownload}
            disabled={busy}
          >
            {busy ? "가져오는 중..." : "리뷰 가져오기"}
          </button>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">수집 후 바로 CSV 파일이 내려받아지며, 이어서 분석 화면으로 이동해 사용할 수 있습니다.</p>

        {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}
        {!error && notice ? <p className="mt-5 text-sm text-white">{notice}</p> : null}
      </Panel>
    </section>
  );
}
