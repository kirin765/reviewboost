"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import FeedbackModal from "@/components/FeedbackModal";
import { getErrorMessage } from "@/types/common";
import AuthShell from "@/components/Auth/AuthShell";
import { useTranslation } from "@/lib/i18n";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const next = useMemo(() => {
    const raw = searchParams.get("next") ?? "/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function mapResetError(raw: string) {
    const message = String(raw || "").trim();
    const lower = message.toLowerCase();
    if (!message) return t("reset.genericError");
    if (lower.includes("password should be at least")) return t("reset.tooShort");
    if (
      lower.includes("invalid") ||
      lower.includes("expired") ||
      lower.includes("session missing") ||
      lower.includes("auth session missing") ||
      lower.includes("pkce")
    ) return t("reset.linkExpired");
    return message;
  }

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setError(mapResetError(sessionError.message));
        return;
      }

      if (!data.session) {
        setError(t("reset.linkExpired"));
        return;
      }

      setSessionReady(true);
    }

    void prepareRecoverySession();

    return () => {
      active = false;
    };
  }, [supabase, t]);

  function handleErrorClose() {
    setError(null);
  }

  function handleNoticeClose() {
    setNotice(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError(t("reset.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset.mismatch"));
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(mapResetError(updateError.message));
        return;
      }
      setNotice(t("reset.success"));
      router.replace(`/login?notice=${encodeURIComponent(t("reset.success"))}&next=${encodeURIComponent(next)}`);
    } catch (err: unknown) {
      setError(mapResetError(getErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <FeedbackModal title={t("reset.failTitle")} message={error} tone="error" onClose={handleErrorClose} /> : null}
      {!error && notice ? <FeedbackModal title={t("modal.notice")} message={notice} onClose={handleNoticeClose} /> : null}
      <AuthShell
        eyebrow="New password"
        title={t("reset.shellTitle")}
        lead={t("reset.shellLead")}
        bullets={[t("reset.bullet1"), t("reset.bullet2"), t("reset.bullet3")]}
        note={t("reset.note")}
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Reset password</p>
          <h2>{t("reset.panelTitle")}</h2>
          <p className="muted">{t("reset.panelLead")}</p>
        </div>

        <form className="fieldRow" onSubmit={onSubmit}>
          <div>
            <label className="muted formInputLabel" htmlFor="new-password">{t("reset.newPassword")}</label>
            <input
              id="new-password"
              className="input"
              type="password"
              placeholder={t("reset.newPasswordPlaceholder")}
              value={password}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="confirm-password">{t("reset.confirmPassword")}</label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              placeholder={t("reset.confirmPlaceholder")}
              value={confirm}
              minLength={6}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          <button className="btn btnPrimary formSubmit" type="submit" disabled={busy || !sessionReady}>
            {busy ? t("reset.submitting") : t("reset.submit")}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
