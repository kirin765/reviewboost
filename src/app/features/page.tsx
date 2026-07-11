import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import StructuredData from "@/components/seo/StructuredData";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";

const featureRecord = getRequiredSeoPageRecord("/features");

const featureCards = [
  {
    href: "/features/ai-review-analysis",
    title: "AI 리뷰 분석",
    description: "감성 분류, 카테고리 분류, 부정 키워드 추출과 우선순위 점수를 한 번에 계산합니다.",
    tag: "핵심",
    accent: "분석"
  },
  {
    href: "/features/review-csv-export",
    title: "리뷰 CSV 추출",
    description: "쿠팡·스마트스토어 리뷰 확보부터 분석 단계 연결까지 작업을 줄입니다.",
    tag: "데이터",
    accent: "수집"
  },
  {
    href: "/features/negative-review-response",
    title: "부정리뷰 대응",
    description: "문제 카테고리별 우선순위를 잡고 상세페이지와 CS 개선안까지 정리합니다.",
    tag: "실행",
    accent: "개선"
  },
  {
    href: "/features/review-faq-generator",
    title: "리뷰 FAQ 생성",
    description: "반복 질문을 FAQ와 답변 템플릿으로 변환해 문의량을 줄입니다.",
    tag: "전환",
    accent: "전환"
  }
] as const;

export const metadata: Metadata = generatePageMetadata(featureRecord);

export default function FeaturesPage() {
  return (
    <main className="pageMain pb-10 pt-8 md:pt-12">
      <StructuredData
        data={createCollectionPageStructuredData(
          featureRecord,
          featureCards.map((card) => ({ name: card.title, path: card.href }))
        )}
      />

      <ShellContainer className="space-y-8">
        <section className="featureHubHero rounded-[30px] border border-[color:#e6e8f2] bg-white px-6 py-7 md:px-8 md:py-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-accent)]">Features</p>
          <div className="featureHubHeroGrid mt-4">
            <div>
              <h1 className="featureHubTitle max-w-4xl text-[clamp(2.15rem,4vw,4rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--rb-fg)]">
                리뷰 운영을 실행으로 연결하는 핵심 기능
              </h1>
              <p className="featureHubLead mt-5 max-w-3xl text-[15px] leading-8 text-[var(--rb-muted-strong)]">
                카드 수를 늘리기보다, 실제로 많이 쓰는 4가지 흐름만 남겼습니다. 리뷰를 읽고, 데이터를 모으고, 문제를 정리하고, FAQ까지 연결하는 핵심 경로만 바로 볼 수 있습니다.
              </p>
            </div>
            <div className="featureHubSide rounded-[24px] border border-[color:#e6e8f2] bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Core flow</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["AI 분석", "CSV 확보", "부정리뷰 대응", "FAQ 생성"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[color:rgba(91,92,234,0.2)] bg-[rgba(91,92,234,0.08)] px-3 py-1 text-xs text-[var(--rb-accent)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
                각 기능 페이지는 검색 유입용 설명과 실제 사용 흐름을 함께 담고 있습니다.
              </p>
            </div>
          </div>
        </section>

        <section className="featureHubGrid">
          {featureCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="featureHubCard group rounded-[28px] border border-[color:#e6e8f2] bg-white p-6 transition hover:border-[color:rgba(91,92,234,0.24)] hover:bg-white md:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full border border-[color:rgba(91,92,234,0.18)] bg-[rgba(91,92,234,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--rb-accent)]">
                    {card.tag}
                  </span>
                  <h2 className="featureHubCardTitle mt-5 text-[clamp(1.6rem,2.3vw,2.1rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">
                    {card.title}
                  </h2>
                </div>
                <span className="text-sm text-[var(--rb-muted)] transition group-hover:text-[var(--rb-accent)]">→</span>
              </div>

              <p className="featureHubCardBody mt-4 max-w-[42ch] text-[15px] leading-8 text-[var(--rb-muted-strong)]">
                {card.description}
              </p>

              <div className="featureHubCardFooter mt-6 border-t border-[color:#e6e8f2] pt-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--rb-muted)]">Focus</p>
                <p className="mt-2 text-base font-medium tracking-[-0.03em] text-[var(--rb-fg)]">{card.accent} 중심 워크플로</p>
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[30px] border border-[color:#e6e8f2] bg-white px-6 py-7 md:px-8 md:py-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Start free</p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--rb-fg)]">
            기능 설명만 보지 말고 실제 데이터로 바로 확인해보세요.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--rb-muted-strong)]">
            샘플 CSV로 각 기능이 어떤 결과를 내는지 몇 분 안에 확인할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href="/dashboard/analyze">
              무료로 분석 시작
            </a>
            <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
