import React from "react";
import type { Metadata } from "next";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "사용법 - ReviewBoost CSV 업로드 & 리뷰 분석 가이드",
  description: "ReviewBoost 사용법을 단계별로 안내합니다. CSV 준비, 열 매핑, AI 분석, PDF 리포트 다운로드까지 2분이면 시작할 수 있습니다.",
  alternates: { canonical: "/help" }
};

export default function HelpPage() {
  const content = getSiteContent("ko");

  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <ShellContainer className="space-y-10">
        <section className="space-y-8">
          <div className="grid gap-6 border-b border-[color:rgba(222,230,242,0.08)] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,420px)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Guide</p>
              <h1 className="mt-4 max-w-3xl text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-white">
                CSV 업로드부터 결과 활용까지
              </h1>
            </div>
            <p className="text-base leading-8 text-[var(--rb-muted-strong)]">
              개발 지식 없이도 CSV만 있으면 바로 분석을 시작할 수 있습니다. 업로드, 열 확인, 결과 활용까지 한 번에 이어지는 기본 흐름만 보여줍니다.
            </p>
          </div>

          <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(24,31,39,0.96),rgba(17,23,31,0.92))] p-5 md:p-7">
            <div className="grid gap-4 xl:grid-cols-4">
              {content.home.solution.strip.map((step) => (
                <div key={step.title} className="rounded-[24px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                  <div className="flex h-24 items-center justify-center rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.04)]">
                    <span className="rounded-full border border-[color:rgba(107,210,193,0.28)] bg-[rgba(107,210,193,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--rb-accent)]">
                      {step.meta}
                    </span>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">{step.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>
                샘플 CSV(컬럼 많음)
              </a>
              <a className={buttonStyles({ variant: "secondary" })} href="/sample_simple.csv" download>
                샘플 CSV(간단)
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(18,24,31,0.94),rgba(13,19,26,0.92))] p-5 md:p-7">
          <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-6">
              <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">1. CSV 준비</p>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">리뷰 내용은 필수, 별점은 권장, 작성일은 최근성 계산에 유용합니다. CSV(쉼표 구분) 형식이 가장 안정적입니다.</p>
              </div>
              <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">2. 업로드</p>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">파일을 올리면 미리보기가 생성되고 열 이름을 자동으로 추정합니다.</p>
              </div>
              <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">3. 열 확인</p>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">리뷰 내용, 별점, 작성일 열을 한 번만 확인하면 분석 준비가 완료됩니다.</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">4. 결과 활용</p>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">카테고리 분포, 긴급 리뷰, 우선순위, 액션 아이템을 읽고 PDF로 공유할 수 있습니다.</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Upload → Analyze → Save</p>
              <div className="mt-5 grid gap-5">
                <div className="rounded-[20px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-base tracking-[-0.03em] text-white">업로드 화면</strong>
                    <span className="text-xs text-[var(--rb-muted)]">CSV / sample</span>
                  </div>
                  <div className="mt-4 h-11 rounded-[14px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.04)]" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                    <strong className="text-base tracking-[-0.03em] text-white">분석 진행</strong>
                    <div className="mt-4 space-y-3 text-sm text-[var(--rb-muted-strong)]">
                      <p>리뷰 수집 중...</p>
                      <p>감정 분석 진행 중...</p>
                      <p>카테고리 분류 중...</p>
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
                    <strong className="text-base tracking-[-0.03em] text-white">결과 화면</strong>
                    <div className="mt-4 space-y-3 text-sm text-[var(--rb-muted-strong)]">
                      <p>총 리뷰 / 부정 비율 / 평균 별점</p>
                      <p>카테고리 탭과 긴급 리뷰</p>
                      <p>우선순위와 액션 아이템</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a className={buttonStyles({ variant: "primary" })} href="/dashboard/analyze">
                    지금 분석하기
                  </a>
                  <a className={buttonStyles({ variant: "ghost" })} href="/coupang-csv">
                    URL로 CSV 받기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
