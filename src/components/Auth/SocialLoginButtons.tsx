"use client";

import { useSearchParams } from "next/navigation";

/**
 * 네이버/카카오 로그인 버튼 — Clerk 가 공식 지원하지 않아 자체 OAuth 브릿지
 * (/api/auth/social/*) 로 연결한다. next 파라미터를 그대로 전달해
 * 로그인 후 원래 가려던 페이지(예: 익스텐션 계정 연결)로 돌아간다.
 *
 * 네이버 버튼은 공식 "네이버 로그인 버튼 사용 가이드"
 * (developers.naver.com/docs/login/bi/bi.md) 의 녹색 완성형 애셋을 사용한다
 * (지정 컬러 #03A94D, N 로고·레이블 조합 — 텍스트 버튼 금지).
 *
 * ⚠️ 노출 제어:
 * - 네이버: NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "1" 일 때만 렌더
 * - 카카오: 위 플래그 **그리고** NEXT_PUBLIC_ENABLE_KAKAO_LOGIN === "1" 일 때만
 *   (카카오가 검수/설정(KOE006) 미완료라 기본 숨김 — 검수 통과 후 추가로 켠다)
 */
const NAVER_VISIBLE = process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "1";
const KAKAO_VISIBLE = NAVER_VISIBLE && process.env.NEXT_PUBLIC_ENABLE_KAKAO_LOGIN === "1";

export default function SocialLoginButtons({ signup = false }: { signup?: boolean }) {
  const params = useSearchParams();
  const next = params.get("next");
  const query = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div
      style={{
        display: KAKAO_VISIBLE || NAVER_VISIBLE ? "flex" : "none",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10,
        marginTop: 20
      }}
    >
      {/* Clerk 위젯 아래 배치 — 구분선 */}
      {/* Clerk 위젯은 컨테이너 왼쪽에 붙어 렌더되므로(가로 가운데가 아님) 이 블록도 왼쪽 정렬해
          네이버 버튼 중심이 Clerk 창 중심과 일치하게 한다. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 400, color: "#aab" }}>
        <span style={{ flex: 1, borderTop: "1px solid #e0e0e0" }} />
        <span style={{ fontSize: 13 }}>또는</span>
        <span style={{ flex: 1, borderTop: "1px solid #e0e0e0" }} />
      </div>
      {NAVER_VISIBLE && (
        <a
          href={`/api/auth/social/naver/start${query}`}
          aria-label="네이버로 로그인"
          style={{ display: "flex", justifyContent: "center", width: "100%", maxWidth: 400 }}
        >
          <img
            src="/images/naver-login-green-h48.png"
            alt="네이버 로그인"
            height={48}
            style={{ height: 48, width: "auto", maxWidth: "100%" }}
          />
        </a>
      )}
      {KAKAO_VISIBLE && (
        <a className="btn" href={`/api/auth/social/kakao/start${query}`} style={{ justifyContent: "center", width: "100%", maxWidth: 400 }}>
          <span aria-hidden>K</span>&nbsp;카카오로 {signup ? "가입" : "로그인"}
        </a>
      )}
    </div>
  );
}