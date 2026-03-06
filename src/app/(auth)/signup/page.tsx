"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";

export const dynamic = "force-dynamic";

export default function SignupPage() {
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
    router.replace(`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title="회원가입 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      <AuthShell
        eyebrow="Create workspace"
        title="저장과 공유가 가능한 리뷰 운영 워크스페이스를 시작하세요."
        lead="ReviewBoost 회원이 되면 분석 결과를 저장하고, 반복적으로 개선해야 하는 이슈를 팀 기준으로 관리할 수 있습니다."
        bullets={["분석 리포트 저장 및 재확인", "지난 분석 히스토리 조회", "구독 플랜 관리"]}
        note="분석 자체는 로그인 없이도 무료로 사용할 수 있습니다."
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Sign up</p>
          <h2>무료로 시작하세요</h2>
          <p className="muted">이메일 계정으로 워크스페이스를 만들고 저장 기능을 활성화하세요.</p>
        </div>

        <form className="fieldRow" action={signUpAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="signup-email">이메일</label>
            <input id="signup-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="signup-password">비밀번호</label>
            <input
              id="signup-password"
              className="input"
              name="password"
              type="password"
              placeholder="비밀번호 (8자 이상 권장)"
              minLength={6}
              required
            />
          </div>
          <label className="consentRow">
            <input type="checkbox" name="agreeTerms" value="yes" required />
            <span>
              [필수] 이용약관 동의 <a className="link formNote" href="/terms" target="_blank" rel="noreferrer">자세히 보기</a>
            </span>
          </label>
          <label className="consentRow">
            <input type="checkbox" name="agreePrivacy" value="yes" required />
            <span>
              [필수] 개인정보 수집·이용 동의 <a className="link formNote" href="/privacy" target="_blank" rel="noreferrer">자세히 보기</a>
            </span>
          </label>
          <div className="consentSummary">
            목적: 회원 식별/로그인/계정관리 | 항목: 이메일 | 보유기간: 회원 탈퇴 시까지(법령 보관 제외) | 거부 시: 회원가입 불가
          </div>
          <label className="consentRow optional">
            <input type="checkbox" name="agreeMarketing" value="yes" />
            <span>[선택] 광고성 정보(이벤트/혜택) 이메일 수신 동의</span>
          </label>
          <button className="btn btnPrimary formSubmit" type="submit">
            회원가입
          </button>
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">이미 계정이 있으신가요?</p>
          <div className="actionRow authActions">
            <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
              로그인
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
