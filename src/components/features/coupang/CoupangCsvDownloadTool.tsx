"use client";

import React, { useCallback, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, Surface } from "@/components/ui/Primitives";
import { downloadCoupangCsv } from "@/lib/api/coupang";
import { useTranslation } from "@/lib/i18n";
import { getErrorMessage } from "@/types/common";

export default function CoupangCsvDownloadTool() {
  const { t } = useTranslation();
  const [productUrl, setProductUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onDownload = useCallback(async () => {
    if (!productUrl.trim()) {
      setError(t("coupangCsv.errorEmpty"));
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
      setNotice(t("coupangCsv.downloadDone"));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [productUrl, t]);

  return (
    <Surface className="px-6 py-7 md:px-8 md:py-9">
      <SectionHeader eyebrow="CSV tool" title={t("coupangCsv.title")} description={t("coupangCsv.lead")} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <label className="mb-3 block text-sm text-[var(--rb-muted-strong)]" htmlFor="coupangProductUrl">
            {t("coupangCsv.inputLabel")}
          </label>
          <input
            id="coupangProductUrl"
            className="input"
            value={productUrl}
            onChange={(event) => setProductUrl(event.target.value)}
            placeholder={t("coupangCsv.inputPlaceholder")}
            disabled={busy}
          />

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={buttonStyles({ variant: "primary" })} onClick={onDownload} disabled={busy}>
              {busy ? t("coupangCsv.downloading") : t("coupangCsv.downloadButton")}
            </button>
            <a className={buttonStyles({ variant: "secondary" })} href="/dashboard">
              {t("coupangCsv.goDashboard")}
            </a>
          </div>

          {error ? <p className="mt-4 text-sm text-[var(--rb-danger)]">{error}</p> : null}
          {!error && notice ? <p className="mt-4 text-sm text-[var(--rb-accent)]">{notice}</p> : null}
        </div>

        <div className="rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Flow</p>
          <ol className="mt-4 space-y-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
            <li>1. 상품 URL을 입력합니다.</li>
            <li>2. 리뷰 CSV를 생성해 다운로드합니다.</li>
            <li>3. 같은 파일을 분석 작업면으로 바로 이어갑니다.</li>
          </ol>
        </div>
      </div>
    </Surface>
  );
}
