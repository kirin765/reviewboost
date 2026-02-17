"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FeedbackModal from "@/components/FeedbackModal";

export default function HomePage() {
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

  function handleErrorClose() {
    router.replace("/");
  }

  function handleNoticeClose() {
    router.replace("/");
  }

  return (
    <main className="pageMain">
      {err ? <FeedbackModal key={err} title="오류 발생" message={err} tone="error" onClose={handleErrorClose} /> : null}
      {!err && notice ? <FeedbackModal key={notice} title="안내" message={notice} onClose={handleNoticeClose} /> : null}
      <div className="card heroCard">
        <a href="/help" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h1 className="heroTitle">리뷰로 매출 올릴 포인트, 자동으로 뽑아드립니다</h1>
          <p className="heroLead">
            CSV로 리뷰를 올리면, 자주 나오는 불만(키워드/카테고리)과 상세페이지/CS/FAQ 문구를 바로 쓸 수 있게 정리해줍니다.
          </p>
        </a>
        <div className="actionRow actionRowLg">
          <a className="btn btnPrimary" href="/dashboard">
            CSV 올리고 분석하기
          </a>
          <a className="btn" href="/help">
            사용법 보기
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>진행 순서</h2>
          <div className="list">
            <div className="row">
              <div className="left">1) CSV 업로드</div>
              <div className="right">리뷰 내용(필수) + 별점(권장)</div>
            </div>
            <div className="row">
              <div className="left">2) 자동 분석</div>
              <div className="right">불만 TOP / 카테고리 / 우선순위</div>
            </div>
            <div className="row">
              <div className="left">3) 개선 제안</div>
              <div className="right">상세페이지/CS/FAQ 문구</div>
            </div>
            <div className="row">
              <div className="left">4) PDF 리포트</div>
              <div className="right">다운로드</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>처음이신가요?</h2>
          <p className="muted">
            가입이나 설정 없이도 분석은 바로 가능합니다. (저장 기능은 로그인 기능을 켜면 사용할 수 있어요.)
          </p>
          <p className="muted">
            CSV 헤더는 어떤 이름이어도 괜찮습니다. 업로드 후 화면에서 &quot;리뷰 내용/별점/작성일&quot; 열만 선택해주면 됩니다.
          </p>
          <div className="actionRow">
            <a className="btn" href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
