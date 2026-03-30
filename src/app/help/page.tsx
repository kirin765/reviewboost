import React from "react";
import type { Metadata } from "next";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, ShellContainer, Surface } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "사용법 - ReviewBoost CSV 업로드 & 리뷰 분석 가이드",
  description: "ReviewBoost 사용법을 단계별로 안내합니다. CSV 준비, 열 매핑, AI 분석, PDF 리포트 다운로드까지 2분이면 시작할 수 있습니다.",
  alternates: { canonical: "/help" }
};

export default function HelpPage() {
  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <ShellContainer className="space-y-6">
        <Surface className="px-6 py-7 md:px-8 md:py-9">
          <SectionHeader eyebrow="Guide" title="CSV 업로드부터 결과 활용까지" description="개발 지식 없이도 CSV만 있으면 바로 리뷰 분석을 시작할 수 있습니다." />
        </Surface>

        <div className="grid gap-4 md:grid-cols-4">
          {["CSV 준비", "업로드", "분석", "결과 활용"].map((step, index) => (
            <Surface key={step} className="px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">0{index + 1}</p>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{step}</h2>
            </Surface>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Surface className="px-6 py-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">1) CSV 준비</h2>
            <div className="mt-5 space-y-3 text-sm text-[var(--rb-muted-strong)]">
              <div className="flex items-center justify-between border-b border-[color:rgba(255,255,255,0.06)] pb-3"><span>필수</span><span>리뷰 내용(텍스트)</span></div>
              <div className="flex items-center justify-between border-b border-[color:rgba(255,255,255,0.06)] pb-3"><span>권장</span><span>별점(0~5)</span></div>
              <div className="flex items-center justify-between pb-1"><span>선택</span><span>작성일</span></div>
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--rb-muted-strong)]">엑셀에서는 보통 CSV(쉼표로 구분) 형식으로 저장하면 가장 안정적으로 읽을 수 있습니다.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>샘플 CSV(컬럼 많음)</a>
              <a className={buttonStyles({ variant: "secondary" })} href="/sample_simple.csv" download>샘플 CSV(간단)</a>
            </div>
          </Surface>

          <Surface className="px-6 py-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">2) 업로드 후 컬럼 확인</h2>
            <p className="mt-5 text-sm leading-7 text-[var(--rb-muted-strong)]">업로드하면 리뷰 내용, 별점, 작성일 열을 한 번만 확인하면 됩니다. 컬럼명이 제각각이어도 화면에서 직접 선택할 수 있습니다.</p>
          </Surface>

          <Surface className="px-6 py-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">3) 결과 활용</h2>
            <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--rb-muted-strong)]">
              <li>핵심 지표: 리뷰 수, 부정 비율, 평균 별점, 우선순위 점수</li>
              <li>카테고리별 문제 분포와 긴급 리뷰</li>
              <li>우선순위 매트릭스와 시뮬레이션</li>
              <li>상세페이지, CS, FAQ 개선 제안</li>
            </ul>
            <a className={`mt-6 ${buttonStyles({ variant: "primary" })}`} href="/dashboard">지금 분석하기</a>
          </Surface>

          <Surface className="px-6 py-6">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">4) 저장과 공유</h2>
            <p className="mt-5 text-sm leading-7 text-[var(--rb-muted-strong)]">로그인하면 결과를 저장해 히스토리에서 다시 볼 수 있고, PDF로 팀과 공유할 수도 있습니다.</p>
          </Surface>
        </div>
      </ShellContainer>
    </main>
  );
}
