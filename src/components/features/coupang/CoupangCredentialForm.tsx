"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/types/common";
import { Panel, primaryButtonClass } from "@/components/marketing/MarketingPrimitives";

type Summary = {
  configured: boolean;
  vendorId: string;
  market: "KR" | "TW";
  accessKeyHint: string | null;
  updatedAt: string | null;
};

const emptySummary: Summary = {
  configured: false,
  vendorId: "",
  market: "KR",
  accessKeyHint: null,
  updatedAt: null
};

export default function CoupangCredentialForm() {
  const [vendorId, setVendorId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [market, setMarket] = useState<"KR" | "TW">("KR");
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/integrations/coupang", { cache: "no-store" });
      const payload = (await response.json()) as Summary | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error?.message || "연동 정보를 불러오지 못했습니다." : "연동 정보를 불러오지 못했습니다.");
      }
      const data = payload as Summary;
      setSummary(data);
      setVendorId(data.vendorId);
      setMarket(data.market);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const onSubmit = useCallback(async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/integrations/coupang", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vendorId, accessKey, secretKey, market })
      });
      const payload = (await response.json()) as Summary | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error?.message || "저장에 실패했습니다." : "저장에 실패했습니다.");
      }
      const data = payload as Summary;
      setSummary(data);
      setVendorId(data.vendorId);
      setAccessKey("");
      setSecretKey("");
      setMarket(data.market);
      setNotice("쿠팡 연동 정보가 저장되었습니다.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [accessKey, market, secretKey, vendorId]);

  return (
    <Panel className="mt-10 max-w-[860px] p-6 md:p-8">
      <div className="grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm text-white/72">vendorId</span>
          <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" value={vendorId} onChange={(event) => setVendorId(event.target.value)} placeholder="예: A00012345" disabled={loading || saving} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-white/72">accessKey</span>
          <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} placeholder={summary.accessKeyHint ? `현재 저장됨 ${summary.accessKeyHint}` : "쿠팡 access key"} disabled={loading || saving} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-white/72">secretKey</span>
          <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" type="password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} placeholder={summary.configured ? "새 secret key 입력 시 덮어쓰기" : "쿠팡 secret key"} disabled={loading || saving} />
        </label>
        <label className="grid gap-2">
          <span className="text-sm text-white/72">market</span>
          <select className="h-12 rounded-[16px] border border-white/[0.08] bg-[#0f141b] px-4 text-white outline-none" value={market} onChange={(event) => setMarket(event.target.value as "KR" | "TW")} disabled={loading || saving}>
            <option value="KR">KR</option>
            <option value="TW">TW</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" className={`${primaryButtonClass} border-0`} onClick={onSubmit} disabled={loading || saving}>
          {saving ? "저장 중..." : "연동 정보 저장"}
        </button>
        {summary.configured ? <span className="text-sm text-[var(--color-muted)]">최근 저장: {summary.updatedAt ? new Date(summary.updatedAt).toLocaleString("ko-KR") : "-"}</span> : null}
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
        입력한 access key와 secret key는 서버에서 암호화해 저장합니다. 저장 후 상품 목록 조회 화면에서는 별도 입력 없이 자동으로 사용됩니다.
      </p>

      {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}
      {!error && notice ? <p className="mt-5 text-sm text-white">{notice}</p> : null}
    </Panel>
  );
}
