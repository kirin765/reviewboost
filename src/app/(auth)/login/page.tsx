"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const err = useMemo(() => {
    const value = searchParams.get("error");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const notice = useMemo(() => {
    const value = searchParams.get("notice");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const value = searchParams.get("next");
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  function handleNoticeClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title="로그인 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      {!err && notice ? <FeedbackModal key={notice} title="안내" message={notice} onClose={handleNoticeClose} /> : null}
      <AuthShell
        eyebrow="Secure access"
        title="분석 기록과 구독 운영을 하나의 워크스페이스로 관리하세요."
        lead="로그인하면 저장된 리포트, 플랜 상태, 이전 분석 기록을 같은 흐름에서 이어서 사용할 수 있습니다."
        bullets={["분석 리포트 저장 및 재확인", "지난 분석 히스토리 조회", "구독 플랜 관리"]}
        note="분석 자체는 로그인 없이도 무료로 사용할 수 있습니다."
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Log in</p>
          <h2>ReviewBoost 로그인</h2>
          <p className="muted">저장 기능과 대시보드 운영 도구를 사용하려면 로그인하세요.</p>
        </div>

        <form className="fieldRow" action={signInAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="login-email">이메일</label>
            <input id="login-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="login-password">비밀번호</label>
            <input id="login-password" className="input" name="password" type="password" placeholder="비밀번호" required />
          </div>
          <button className="btn btnPrimary formSubmit" type="submit">
            로그인
          </button>
          <div className="formHintRow">
            <a className="link formNote" href={`/forgot-password?next=${encodeURIComponent(next)}`}>
              비밀번호를 잊으셨나요?
            </a>
          </div>
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">계정이 없으신가요?</p>
          <div className="actionRow authActions">
            <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
              회원가입
            </a>
            <a className="btn btnOutline" href="/dashboard">
              분석하러 가기
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
