"use client";

import { useCallback, useState } from "react";
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
    <section className="card">
      <h1 className="dashboardPageTitle">{t("coupangCsv.title")}</h1>
      <p className="dashboardPageLead">{t("coupangCsv.lead")}</p>

      <div className="sectionSpacing">
        <label className="label" htmlFor="coupangProductUrl">
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
      </div>

      <div className="actionRow sectionSpacing">
        <button type="button" className={`btn btnPrimary ${busy ? "btnLoading" : ""}`} onClick={onDownload} disabled={busy}>
          {busy ? t("coupangCsv.downloading") : t("coupangCsv.downloadButton")}
        </button>
        <a className="btn" href="/dashboard">
          {t("coupangCsv.goDashboard")}
        </a>
      </div>

      {error ? <p className="hint danger">{error}</p> : null}
      {!error && notice ? <p className="hint">{notice}</p> : null}
    </section>
  );
}
