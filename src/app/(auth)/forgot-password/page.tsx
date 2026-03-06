"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const err = useMemo(() => {
    const value = searchParams.get("error");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const value = searchParams.get("next");
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/forgot-password${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title="재설정 요청 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      <AuthShell
        eyebrow="Password recovery"
        title="접근 권한은 유지한 채 안전하게 비밀번호를 재설정하세요."
        lead="가입한 이메일로 재설정 링크를 보내고, 완료 후 바로 분석 워크스페이스로 복귀할 수 있도록 구성했습니다."
        bullets={["재설정 링크 이메일 발송", "완료 후 로그인 화면으로 복귀", "분석 워크스페이스 next 파라미터 유지"]}
        note="요청 후 메일이 오지 않으면 스팸함도 확인해주세요."
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Recover</p>
          <h2>비밀번호 재설정</h2>
          <p className="muted">가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
        </div>

        <form className="fieldRow" action={requestPasswordResetAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="reset-request-email">이메일</label>
            <input id="reset-request-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <button className="btn btnPrimary formSubmit" type="submit">
            재설정 메일 보내기
          </button>
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">다른 경로로 이동하시겠어요?</p>
          <div className="actionRow authActions">
            <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
              로그인으로 이동
            </a>
            <a className="btn btnOutline" href={`/signup?next=${encodeURIComponent(next)}`}>
              회원가입
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
