"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const err = useMemo(() => {
    const v = searchParams.get("error");
    return typeof v === "string" ? v : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const v = searchParams.get("next");
    return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/forgot-password${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <main className="pageMain">
      {err ? <FeedbackModal key={err} title="재설정 요청 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      <div className="grid">
        <div className="card">
          <h2>비밀번호 재설정</h2>
          <p className="muted">가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>

            <form action={requestPasswordResetAction} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input type="hidden" name="next" value={next} />
              <input className="input" name="email" type="email" placeholder="email@example.com" required />
              <button className="btn btnPrimary" type="submit" style={{ marginTop: 8 }}>
                재설정 메일 보내기
              </button>
            </form>

          {!err ? (
            <p className="hint muted">요청 후 메일이 오지 않으면 스팸함도 확인해주세요.</p>
          ) : null}
        </div>

        <div className="card">
          <h2>로그인으로 이동</h2>
          <p className="muted">비밀번호가 기억나면 바로 로그인할 수 있습니다.</p>
          <div className="actionRow">
            <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
              로그인으로 이동
            </a>
            <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
              회원가입
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
