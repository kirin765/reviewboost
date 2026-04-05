"use client";

import { motion } from "framer-motion";
import {
  Eyebrow,
  Panel,
  SectionHeading,
  pageShellClass,
  primaryButtonClass,
  secondaryButtonClass
} from "@/components/marketing/MarketingPrimitives";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
} as const;

const categories = [
  { name: "품질", share: 33.3, delta: "반복 불만 1위", color: "#f87171" },
  { name: "배송", share: 20, delta: "최근성 높음", color: "#f2c94c" },
  { name: "사용성", share: 20, delta: "상세페이지 개선 필요", color: "#818cf8" },
  { name: "기타", share: 20, delta: "개별 확인", color: "#6b7280" },
  { name: "가격", share: 6.7, delta: "프로모션 검토", color: "#34d399" }
];

const workflow = [
  ["01", "상품 URL 또는 CSV 입력", "분석 시작 장벽을 낮추고 수집 경로를 하나로 묶습니다."],
  ["02", "AI가 감정과 카테고리 분류", "부정 신호를 배송, 품질, 사용성 같은 운영 단위로 재구성합니다."],
  ["03", "우선순위와 시뮬레이션 계산", "빈도, 영향도, 최근성을 함께 반영해 먼저 고칠 문제를 보여줍니다."],
  ["04", "상세페이지·CS·상품 개선 액션", "결과를 운영팀이 바로 실행할 수 있는 문장과 액션으로 연결합니다."]
];

const faqs = [
  ["어떤 셀러 팀에 맞나요?", "쿠팡과 스마트스토어에서 리뷰가 꾸준히 쌓이고, 운영 우선순위를 빠르게 정해야 하는 팀에 적합합니다."],
  ["무료 체험 범위는 어떻게 되나요?", "오늘 바로 5회 무료 분석이 가능하고 핵심 요약, 카테고리 분포, 우선순위 흐름을 확인할 수 있습니다."],
  ["결과물은 어디까지 제공하나요?", "부정 비율, 평균 평점, 문제 카테고리, 긴급 리뷰, 액션 아이템, 평점 회복 시뮬레이션까지 제공합니다."],
  ["CSV 없이도 시작 가능한가요?", "상품 URL로 리뷰를 먼저 가져오고, 필요한 경우 CSV 다운로드와 저장 흐름으로 이어갈 수 있습니다."]
];

function AnalysisPreview() {
  return (
    <Panel className="overflow-hidden p-5 md:p-7">
      {/* Metrics row */}
      <div className="grid gap-4 border-b border-white/[0.07] pb-5 md:grid-cols-4">
        {[
          { label: "Negative rate", value: "33%", color: "#f87171" },
          { label: "Avg rating", value: "3.33 / 5", color: "#f2c94c" },
          { label: "Priority", value: "46.7", color: "#f87171" },
          { label: "Recent weight", value: "73%", color: "#34d399" }
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{label}</div>
            <div className="mt-2 text-[1.6rem] font-semibold tracking-[-0.05em]" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Category bars */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-white">Priority categories</div>
            <div className="rounded-full border border-white/[0.07] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">AI ranked</div>
          </div>
          <div className="space-y-3.5">
            {categories.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-12 text-right text-xs font-medium" style={{ color: item.color }}>{item.name}</div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-2 rounded-full"
                      style={{ background: item.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.share}%` }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{item.delta}</div>
                </div>
                <span className="w-10 text-right font-mono text-xs text-[var(--color-muted)]">{item.share}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-2.5">
          {[
            { label: "Urgent review", body: "포장 파손과 지연 배송이 함께 언급되며 교환 경험까지 악화시키고 있습니다.", accent: "#f87171" },
            { label: "Action item", body: "포장 안정성 설명을 상세페이지 상단으로 올리고, 배송 지연 대응 문구를 같이 정리하세요.", accent: "#4f7fff" },
            { label: "Simulation", body: "상위 2개 문제를 75% 줄이면 예상 평점은 4.67까지 회복됩니다.", accent: "#34d399" }
          ].map(({ label, body, accent }) => (
            <div key={label} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{label}</div>
              </div>
              <p className="mt-2 text-sm leading-[1.75] text-white/85">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export default function HomePageContent() {
  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_15%_15%,rgba(79,127,255,0.18),transparent_50%),radial-gradient(ellipse_40%_40%_at_85%_20%,rgba(99,102,241,0.14),transparent_50%),linear-gradient(180deg,rgba(5,7,10,0)_0%,rgba(5,7,10,0.22)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

        <div className={`${pageShellClass} relative pt-10 md:pt-14`}>
          <div className="grid min-h-[calc(100svh-120px)] items-center gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[560px]"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4f7fff] opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4f7fff]" />
                </span>
                <span className="text-white/60">쿠팡 · 스마트스토어 셀러용</span>
                <span className="text-white font-medium">Review Intelligence</span>
              </div>

              <div className="mt-7 text-[11px] uppercase tracking-[0.28em] text-white/36">ReviewBoost</div>
              <h1 className="mt-3.5 text-[2.8rem] font-semibold leading-[1.06] tracking-[-0.07em] text-white md:text-[4.2rem] md:leading-[0.97]">
                리뷰에서<br />
                매출을 막는 문제를<br />
                먼저 찾습니다
              </h1>
              <p className="mt-6 max-w-[500px] text-[1rem] leading-[1.85] text-[var(--color-muted)]">
                AI가 리뷰를 감정과 카테고리로 읽고, 지금 가장 먼저 해결해야 할 운영 이슈를 우선순위와 액션으로 정리합니다.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a className={primaryButtonClass} href="/dashboard/analyze">
                  지금 리뷰 분석 시작하기
                </a>
                <a className={secondaryButtonClass} href="/coupang-csv">
                  상품 URL로 리뷰 가져오기
                </a>
              </div>

              <div className="mt-8 grid gap-5 border-t border-white/[0.07] pt-7 sm:grid-cols-3">
                {[
                  ["오늘 무료", "5회 분석"],
                  ["평균 처리", "3분 이내"],
                  ["실행 결과", "액션과 시뮬레이션"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/36">{label}</div>
                    <div className="mt-1.5 text-sm font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.84, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(79,127,255,0.28),transparent_70%)] blur-2xl" />
              <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.22),transparent_70%)] blur-2xl" />
              <AnalysisPreview />
            </motion.div>
          </div>
        </div>
      </section>

      <div className={pageShellClass}>
        {/* Problem */}
        <motion.section className="grid gap-12 pt-8 lg:grid-cols-[0.96fr_1.04fr]" {...reveal}>
          <SectionHeading
            eyebrow="Problem"
            title="리뷰는 쌓이는데, 운영 판단은 여전히 늦습니다."
            body="불만은 이미 리뷰 안에 남아 있지만 실제 운영 액션으로 연결되지 않는 경우가 많습니다. 결국 반복되는 문제가 방치되고 전환율과 평점이 함께 흔들립니다."
          />
          <div className="grid gap-3">
            {[
              { title: "고객은 이미 문제를 말합니다", body: "배송 지연, 품질 불만, 사용성 문제 같은 신호가 낮은 평점 리뷰에 반복적으로 쌓입니다.", accent: "#f87171" },
              { title: "하지만 팀은 무엇부터 고칠지 모릅니다", body: "리뷰가 흩어져 있어 실제 영향이 큰 문제와 급한 문제를 빠르게 구분하기 어렵습니다.", accent: "#f2c94c" },
              { title: "그래서 전환율 회복 타이밍을 놓칩니다", body: "상품 개선, 상세페이지 수정, CS 문구 정리가 뒤늦게 따라오면서 손실이 누적됩니다.", accent: "#818cf8" }
            ].map(({ title, body, accent }) => (
              <Panel key={title} className="p-6 group">
                <div className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
                  <div>
                    <h3 className="text-[1.5rem] font-medium tracking-[-0.05em] text-white">{title}</h3>
                    <p className="mt-2.5 text-[0.935rem] leading-[1.85] text-[var(--color-muted)]">{body}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </motion.section>

        {/* Workflow */}
        <motion.section className="mt-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]" {...reveal}>
          <SectionHeading
            eyebrow="Workflow"
            title="수집부터 액션까지 하나의 흐름으로 묶었습니다."
            body="ReviewBoost는 리뷰 수집, 감정 분석, 카테고리 분류, 우선순위 계산, 개선 액션 연결까지 운영에 필요한 흐름을 하나의 화면 언어로 정리합니다."
          />
          <div className="space-y-0">
            {workflow.map(([index, title, body], i) => (
              <div key={index} className="grid grid-cols-[52px_1fr] gap-4 border-t border-white/[0.07] py-6 group">
                <div className="pt-1">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.03] font-mono text-[10px] text-[var(--color-muted)] transition group-hover:border-[var(--color-primary)] group-hover:text-[var(--color-primary)]">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <div className="text-[1.5rem] font-medium tracking-[-0.05em] text-white">{title}</div>
                  <p className="mt-2 text-[0.935rem] leading-[1.85] text-[var(--color-muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Workspace preview */}
        <motion.section className="mt-24" {...reveal}>
          <SectionHeading
            eyebrow="Workspace"
            title="실제 분석 화면은 넓고 밀도 있게 읽히도록 설계했습니다."
            body="중요한 지표, 카테고리 비교, 긴급 리뷰, 액션 추천을 한 흐름으로 배치해 스크롤보다 판단이 먼저 일어나도록 만들었습니다."
            centered
          />
          <Panel className="mt-10 overflow-hidden p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr]">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
                  <div className="text-xl font-medium text-white">Analysis dashboard</div>
                  <div className="rounded-full border border-white/[0.07] px-3 py-1 text-xs text-[var(--color-muted)]">최근 30일 기준</div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  {[
                    { label: "Negative", value: "33%", color: "#f87171" },
                    { label: "Rating", value: "3.33", color: "#f2c94c" },
                    { label: "Priority", value: "46.7", color: "#f87171" },
                    { label: "Recent", value: "73%", color: "#34d399" }
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">{label}</div>
                      <div className="mt-2 text-[1.7rem] font-semibold tracking-[-0.05em]" style={{ color }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 h-[200px] rounded-[22px] border border-white/[0.07] bg-[radial-gradient(circle_at_top,rgba(79,127,255,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-5">
                  <svg viewBox="0 0 640 160" className="h-full w-full">
                    <path d="M26 140 H614" stroke="rgba(255,255,255,0.06)" />
                    <path d="M26 100 H614" stroke="rgba(255,255,255,0.04)" />
                    <path d="M26 60 H614" stroke="rgba(255,255,255,0.04)" />
                    <defs>
                      <linearGradient id="lineGradient" x1="38" y1="132" x2="602" y2="40" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4f7fff" />
                        <stop offset="1" stopColor="#818cf8" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f7fff" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#4f7fff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d="M38 132 C110 60, 156 95, 230 72 S338 52, 400 86 S510 112, 602 40"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Urgent reviews", body: "최근 리뷰에서 품질과 배송 문제가 가장 자주, 가장 강하게 함께 등장합니다.", accent: "#f87171" },
                  { label: "Priority list", body: "품질 → 사용성 → 배송 순서로 대응하는 것이 평점 회복과 CS 감소에 가장 효율적입니다.", accent: "#4f7fff" },
                  { label: "Recommended actions", body: "상세페이지 상단 카피 정리, 포장 안정성 강조, 교환 안내 문구 보완이 즉시 실행 가능한 액션입니다.", accent: "#818cf8" }
                ].map(({ label, body, accent }) => (
                  <Panel key={label} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
                      <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{label}</div>
                    </div>
                    <p className="text-sm leading-[1.75] text-white/80">{body}</p>
                  </Panel>
                ))}
                <Panel className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34d399]" />
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#34d399]">Expected recovery</div>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs text-[var(--color-muted)]">상위 문제 75% 개선 시</div>
                      <div className="mt-1 text-[2.6rem] font-semibold tracking-[-0.06em] text-white">4.67</div>
                    </div>
                    <div className="rounded-full border border-[#34d399]/25 bg-[#34d399]/[0.08] px-3 py-1.5 text-xs font-medium text-[#34d399]">+1.33 uplift</div>
                  </div>
                </Panel>
              </div>
            </div>
          </Panel>
        </motion.section>

        {/* FAQ */}
        <motion.section className="mt-24 grid gap-12 lg:grid-cols-[0.95fr_1.05fr]" {...reveal}>
          <SectionHeading
            eyebrow="FAQ"
            title="도입 전에 가장 많이 확인하는 질문"
            body="무료 체험 범위, 도입 방식, 결과물 범위를 빠르게 확인할 수 있도록 정리했습니다."
          />
          <div className="space-y-3">
            {faqs.map(([question, answer], i) => (
              <Panel key={question} className="p-5 group">
                <div className="flex items-start gap-3">
                  <span className="mt-1 font-mono text-[10px] text-[var(--color-text-tertiary)]">0{i + 1}</span>
                  <div>
                    <h3 className="text-[1.15rem] font-medium tracking-[-0.04em] text-white">{question}</h3>
                    <p className="mt-2 text-[0.9rem] leading-[1.85] text-[var(--color-muted)]">{answer}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section className="mt-24" {...reveal}>
          <Panel className="relative overflow-hidden p-8 md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_70%_50%,rgba(79,127,255,0.1),transparent_60%)]" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[680px]">
                <Eyebrow>Start now</Eyebrow>
                <h2 className="mt-5 text-[2.2rem] font-semibold leading-[1.06] tracking-[-0.065em] text-white md:text-[3.4rem] md:leading-[1.02]">
                  가장 급한 문제부터<br />이번 주 안에 정리하세요
                </h2>
                <p className="mt-4 text-[0.975rem] leading-[1.85] text-[var(--color-muted)]">
                  오늘 바로 5회 무료 분석이 가능합니다. 리뷰 CSV를 올리거나 상품 URL로 리뷰를 가져와 바로 시작하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a className={primaryButtonClass} href="/dashboard/analyze">
                  지금 리뷰 분석 시작하기
                </a>
                <a className={secondaryButtonClass} href="/pricing">
                  플랜 비교 보기
                </a>
              </div>
            </div>
          </Panel>
        </motion.section>
      </div>
    </div>
  );
}
