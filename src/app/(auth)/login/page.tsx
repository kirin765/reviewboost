"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const err = useMemo(() => {
    const v = searchParams.get("error");
    return typeof v === "string" ? v : "";
  }, [searchParams]);

  const notice = useMemo(() => {
    const v = searchParams.get("notice");
    return typeof v === "string" ? v : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const v = searchParams.get("next");
    return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  function handleNoticeClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <main className="pageMain pageTop">
      {err ? <FeedbackModal key={err} title="로그인 실패" message={err} tone="error" onClose={handleErrorClose} /> : null}
      {!err && notice ? <FeedbackModal key={notice} title="안내" message={notice} onClose={handleNoticeClose} /> : null}
      <div className="card pageNarrow">
        <div className="splitGrid">
          {/* Left: Value proposition */}
          <div>
            <h2 className="titleBlock">ReviewBoost에 오신 것을 환영합니다</h2>
            <p className="muted formLead">
              리뷰 기반 매출 개선 서비스를 이용하려면 로그인하세요.
            </p>
            <div className="textPanel">
              <h4 className="titleSmall">로그인하면:</h4>
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

          {/* Right: Login form */}
          <div>
            <h3 className="titleBlock">로그인</h3>
            <form className="fieldRow" action={signInAction}>
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
                  placeholder="비밀번호"
                  required
                />
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
            <div className="formBottom">
              <p className="muted formBottomNote">계정이 없으신가요?</p>
              <div className="actionRow">
                <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
                  회원가입
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
