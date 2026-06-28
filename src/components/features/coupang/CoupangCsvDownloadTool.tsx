"use client";

import React, { useCallback, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
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
    <section className="max-w-[820px] py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Review download</p>
      <h1 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-[var(--rb-fg)]">
        {t("coupangCsv.title")}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--rb-muted-strong)]">{t("coupangCsv.lead")}</p>

      <div className="mt-12">
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
          <a className={buttonStyles({ variant: "ghost" })} href="/dashboard/analyze">
            {t("coupangCsv.goDashboard")}
          </a>
        </div>

        {error ? <p className="mt-4 text-sm text-[var(--rb-danger)]">{error}</p> : null}
        {!error && notice ? <p className="mt-4 text-sm text-[var(--rb-accent)]">{notice}</p> : null}

        <div className="mt-8 flex flex-wrap gap-6 border-t border-[color:rgba(31,37,89,0.08)] pt-6 text-sm text-[var(--rb-muted-strong)]">
          <span>상품 URL 한 개만 입력하면 됩니다.</span>
          <span>생성된 CSV는 바로 분석 흐름으로 이어집니다.</span>
        </div>
      </div>
    </section>
  );
}
