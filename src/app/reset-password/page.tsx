"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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
    const msg = String(raw || "").trim();
    const lower = msg.toLowerCase();
    if (!msg) return "비밀번호 변경 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (lower.includes("password should be at least")) return "비밀번호는 최소 6자 이상이어야 합니다.";
    if (lower.includes("invalid") || lower.includes("expired")) return "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.";
    return msg;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    } catch (e: any) {
      setError(mapResetError(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pageMain">
      <div className="grid">
        <div className="card">
          <h2>새 비밀번호 설정</h2>
          <p className="muted">재설정 링크로 접근한 뒤 새 비밀번호를 입력하세요.</p>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <input
              className="input"
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={password}
              minLength={6}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="새 비밀번호 확인"
              value={confirm}
              minLength={6}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button className="btn btnPrimary" type="submit" disabled={busy}>
              {busy ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
          {error ? (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {error}
            </p>
          ) : notice ? (
            <p className="hint ok" style={{ whiteSpace: "pre-wrap" }}>
              {notice}
            </p>
          ) : (
            <p className="hint muted">링크가 만료되면 로그인 화면에서 비밀번호 재설정을 다시 요청하세요.</p>
          )}
        </div>
      </div>
    </main>
  );
}
