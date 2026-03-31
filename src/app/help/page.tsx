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

const HELP_STAGE_DETAILS = [
  {
    eyebrow: "CSV 준비",
    title: "분석에 필요한 열만 맞추면 시작할 수 있습니다.",
    lead: "리뷰 내용은 필수, 별점은 권장, 작성일은 최근성 계산에 유용합니다. 컬럼명이 조금 달라도 다음 단계에서 직접 연결할 수 있으니 먼저 구조를 너무 깔끔하게 다듬을 필요는 없습니다.",
    bullets: [
      "필수 열: 리뷰 내용 텍스트",
      "권장 열: 별점(0~5)",
      "선택 열: 작성일",
      "CSV(쉼표 구분) 형식이 가장 안정적입니다."
    ]
  },
  {
    eyebrow: "업로드",
    title: "파일을 올리면 미리보기와 자동 추정이 바로 생성됩니다.",
    lead: "샘플 CSV로 바로 테스트할 수도 있고, 실제 리뷰 파일을 올려도 됩니다. 업로드 직후에는 화면이 바로 바뀌지 않고 다음 단계로 이동할 준비를 마친 상태가 됩니다.",
    bullets: [
      "드래그 앤 드롭 또는 파일 선택",
      "샘플 CSV로 즉시 체험 가능",
      "선택한 파일 이름과 용량 확인",
      "다음 단계 버튼으로 열 매핑으로 이동"
    ]
  },
  {
    eyebrow: "열 확인",
    title: "리뷰 내용, 별점, 작성일 열을 한 번만 맞추면 분석 준비가 끝납니다.",
    lead: "자동 추정이 틀릴 수 있으니 이 단계에서 실제 리뷰 텍스트 열이 맞는지만 확인하면 됩니다. 긴 셀 값은 클릭해서 전체 내용을 볼 수 있습니다.",
    bullets: [
      "리뷰 내용 열 재확인",
      "별점/작성일 열 수동 보정 가능",
      "열이 많아도 주요 컬럼 위주로 확인",
      "분석 시작 버튼으로 바로 다음 단계 진행"
    ]
  },
  {
    eyebrow: "결과 활용",
    title: "긴급 리뷰, 우선순위, 시뮬레이션으로 운영 결정을 연결합니다.",
    lead: "분석이 끝나면 요약 지표만 보는 데서 끝나지 않고, 어떤 이슈를 먼저 고칠지와 어떤 문구를 상세페이지·CS·FAQ에 반영할지를 한 화면에서 읽습니다.",
    bullets: [
      "부정 비율과 평균 별점 확인",
      "카테고리 탭에서 원인 분리",
      "긴급 리뷰와 액션 아이템 확인",
      "PDF 다운로드 또는 저장 상세로 이어짐"
    ]
  }
];

export default function HelpPage() {
  const content = getSiteContent("ko");
  const stages = content.home.solution.strip.map((step, index) => ({
    ...step,
    ...HELP_STAGE_DETAILS[index]
  }));

  return (
    <main className="pageMain pb-10 pt-8 md:pt-12">
      <ShellContainer className="space-y-10">
        <section className="grid gap-6 border-b border-[color:rgba(222,230,242,0.08)] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,420px)]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">사용 가이드</p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-white">
              스크롤하면서 분석 과정을 한 단계씩 확인하세요
            </h1>
          </div>
          <p className="text-base leading-8 text-[var(--rb-muted-strong)]">
            랜딩에서 본 흐름을 실제 사용 순서대로 다시 풀어놓았습니다. CSV 준비부터 결과 활용까지, 각 단계에서 사용자가 무엇을 하고 무엇을 얻는지 바로 이해할 수 있게 정리했습니다.
          </p>
        </section>

        <section className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[26px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(18,24,31,0.96),rgba(13,19,26,0.92))] p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">단계 안내</p>
              <div className="mt-5 space-y-4">
                {stages.map((stage, index) => (
                  <a key={stage.title} href={`#help-stage-${index + 1}`} className="flex items-start gap-3 rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 transition hover:border-[color:rgba(107,210,193,0.24)] hover:bg-[rgba(255,255,255,0.04)]">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-[color:rgba(107,210,193,0.3)] bg-[rgba(107,210,193,0.08)] text-xs font-semibold text-[var(--rb-accent)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--rb-muted)]">{stage.meta}</p>
                      <strong className="mt-2 block text-sm font-medium text-white">{stage.title}</strong>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            {stages.map((stage, index) => (
              <section
                id={`help-stage-${index + 1}`}
                key={stage.title}
                className="rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(18,24,31,0.96),rgba(13,19,26,0.92))] p-5 md:p-7"
              >
                <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(300px,0.75fr)] xl:items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{stage.eyebrow}</p>
                    <h2 className="mt-4 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-white">{stage.title}</h2>
                    <p className="mt-5 max-w-3xl text-sm leading-8 text-[var(--rb-muted-strong)]">{stage.lead}</p>

                    <div className="mt-6 grid gap-3">
                      {stage.bullets.map((bullet) => (
                        <div key={bullet} className="flex items-start gap-3 rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
                          <span className="mt-2 h-2 w-2 rounded-full bg-[var(--rb-accent)]" aria-hidden="true" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">이 단계에서 하는 일</p>
                    <div className="mt-5 space-y-4">
                      <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                        <strong className="text-base tracking-[-0.03em] text-white">사용자가 하는 일</strong>
                        <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{stage.body}</p>
                      </div>
                      <div className="rounded-[18px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                        <strong className="text-base tracking-[-0.03em] text-white">다음으로 이어지는 화면</strong>
                        <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">
                          {index === 0 ? "업로드 후에는 파일 상태를 확인하고 열 매핑 단계로 이동합니다." : null}
                          {index === 1 ? "업로드가 끝나면 실제 리뷰 데이터 미리보기와 열 선택 UI가 열립니다." : null}
                          {index === 2 ? "열이 맞으면 즉시 분석 단계로 넘어가며, 터미널 스타일 진행 UI가 실행됩니다." : null}
                          {index === 3 ? "분석 완료 후에는 저장 상세, PDF 다운로드, 다음 분석으로 바로 이어집니다." : null}
                        </p>
                      </div>
                      {index === 0 ? (
                        <div className="flex flex-wrap gap-3 pt-2">
                          <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>
                            샘플 CSV(컬럼 많음)
                          </a>
                          <a className={buttonStyles({ variant: "ghost" })} href="/sample_simple.csv" download>
                            샘플 CSV(간단)
                          </a>
                        </div>
                      ) : null}
                      {index === stages.length - 1 ? (
                        <div className="flex flex-wrap gap-3 pt-2">
                          <a className={buttonStyles({ variant: "primary" })} href="/dashboard/analyze">
                            지금 분석하기
                          </a>
                          <a className={buttonStyles({ variant: "ghost" })} href="/coupang-csv">
                            URL로 CSV 받기
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
