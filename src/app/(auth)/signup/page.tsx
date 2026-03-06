"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";

export const dynamic = "force-dynamic";

export default function SignupPage() {
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
    router.replace(`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <main className="pageMain pageTop">
      {err ? <FeedbackModal key={err} title="회원가입 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      <div className="card pageNarrow">
        <div className="splitGrid">
          {/* Left: Value proposition */}
          <div>
            <h2 className="titleBlock">무료로 시작하세요</h2>
            <p className="muted formLead">
              ReviewBoost 회원이 되어 분석 리포트를 저장하고 관리하세요.
            </p>
            <div className="textPanel">
              <h4 className="titleSmall">회원 가입 시:</h4>
              <ul className="formList">
                <li>분석 리포트 저장 및 재확인</li>
                <li>지난 분석 히스토리 조회</li>
                <li>구독 플랜 관리</li>
              </ul>
            </div>
            <div className="panelHint">
              <p className="panelHintText">
                분석 자체는 로그인 없이도 무료로 사용 가능합니다.
              </p>
            </div>
          </div>

          {/* Right: Signup form */}
          <div>
            <h3 className="titleBlock">회원가입</h3>
            <form className="fieldRow" action={signUpAction}>
              <input type="hidden" name="next" value={next} />
              <div>
                <label className="muted formInputLabel">이메일</label>
                <input className="input" name="email" type="email" placeholder="email@example.com" required />
              </div>
              <div>
                <label className="muted formInputLabel">비밀번호</label>
                <input
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
                  [필수] 이용약관 동의{" "}
                  <a className="link formNote" href="/terms" target="_blank" rel="noreferrer">
                    자세히 보기
                  </a>
                </span>
              </label>
              <label className="consentRow">
                <input type="checkbox" name="agreePrivacy" value="yes" required />
                <span>
                  [필수] 개인정보 수집·이용 동의{" "}
                  <a className="link formNote" href="/privacy" target="_blank" rel="noreferrer">
                    자세히 보기
                  </a>
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
            <div className="formBottom">
              <p className="muted formBottomNote">이미 계정이 있으신가요?</p>
              <div className="actionRow">
                <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
                  로그인
                </a>
                <a className="btn btnOutline" href="/dashboard">
                  분석하러 가기
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
