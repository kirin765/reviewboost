"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import FeedbackModal from "@/components/FeedbackModal";
import { getErrorMessage } from "@/types/common";
import AuthShell from "@/components/Auth/AuthShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => {
    const raw = searchParams.get("next") ?? "/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function mapResetError(raw: string) {
    const message = String(raw || "").trim();
    const lower = message.toLowerCase();
    if (!message) return "비밀번호 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (lower.includes("password should be at least")) return "비밀번호는 최소 6자 이상이어야 합니다.";
    if (lower.includes("invalid") || lower.includes("expired")) return "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.";
    return message;
  }

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
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(mapResetError(updateError.message));
        return;
      }
      setNotice("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      router.replace(`/login?notice=${encodeURIComponent("비밀번호가 변경되었습니다. 다시 로그인해주세요.")}&next=${encodeURIComponent(next)}`);
    } catch (err: unknown) {
      setError(mapResetError(getErrorMessage(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <FeedbackModal title="비밀번호 변경 실패" message={error} tone="error" onClose={handleErrorClose} /> : null}
      {!error && notice ? <FeedbackModal title="안내" message={notice} onClose={handleNoticeClose} /> : null}
      <AuthShell
        eyebrow="New password"
        title="새 비밀번호를 설정하고 다시 워크스페이스로 복귀하세요."
        lead="재설정 링크로 접근한 뒤 새 비밀번호를 입력하면 로그인 화면으로 이동해 바로 분석을 이어갈 수 있습니다."
        bullets={["링크 유효성 오류 문구 처리", "비밀번호/확인 입력 검증", "완료 후 로그인 화면으로 자동 이동"]}
        note="링크가 만료되면 로그인 화면에서 비밀번호 재설정을 다시 요청하세요."
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Reset password</p>
          <h2>새 비밀번호 설정</h2>
          <p className="muted">재설정 링크로 접근한 뒤 새 비밀번호를 입력하세요.</p>
        </div>

        <form className="fieldRow" onSubmit={onSubmit}>
          <div>
            <label className="muted formInputLabel" htmlFor="new-password">새 비밀번호</label>
            <input
              id="new-password"
              className="input"
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={password}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="confirm-password">새 비밀번호 확인</label>
            <input
              id="confirm-password"
              className="input"
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirm}
              minLength={6}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </div>
          <button className="btn btnPrimary formSubmit" type="submit" disabled={busy}>
            {busy ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
