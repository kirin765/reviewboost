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
  { name: "품질", share: 33.3, delta: "반복 불만 1위" },
  { name: "배송", share: 20, delta: "최근성 높음" },
  { name: "사용성", share: 20, delta: "상세페이지 개선 필요" },
  { name: "기타", share: 20, delta: "개별 확인" },
  { name: "가격", share: 6.7, delta: "프로모션 검토" }
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
      <div className="grid gap-4 border-b border-white/[0.08] pb-5 md:grid-cols-4">
        {[
          ["Negative rate", "33%"],
          ["Avg rating", "3.33 / 5"],
          ["Priority", "46.7"],
          ["Recent weight", "73%"]
        ].map(([label, value]) => (
          <div key={label}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-white">Priority categories</div>
            <div className="text-sm text-[var(--color-muted)]">AI ranked</div>
          </div>
          <div className="mt-5 space-y-4">
            {categories.map((item) => (
              <div key={item.name} className="grid grid-cols-[56px_1fr] gap-4">
                <div className="pt-0.5 text-sm text-white">{item.name}</div>
                <div>
                  <div className="h-2.5 rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-2.5 rounded-full bg-[linear-gradient(90deg,#8fd4ff,#6c81ff)]"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.share}%` }}
                      viewport={{ once: true, amount: 0.8 }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-muted)]">
                    <span>{item.delta}</span>
                    <span>{item.share}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {[
            ["Urgent review", "포장 파손과 지연 배송이 함께 언급되며 교환 경험까지 악화시키고 있습니다."],
            ["Action item", "포장 안정성 설명을 상세페이지 상단으로 올리고, 배송 지연 대응 문구를 같이 정리하세요."],
            ["Simulation", "상위 2개 문제를 75% 줄이면 예상 평점은 4.67까지 회복됩니다."]
          ].map(([title, body], index) => (
            <div key={title} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{title}</div>
              <p className={`mt-3 leading-7 ${index === 2 ? "text-base text-white" : "text-sm text-white/86"}`}>{body}</p>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(120,199,255,0.22),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(108,129,255,0.2),transparent_28%),linear-gradient(180deg,rgba(5,7,10,0)_0%,rgba(5,7,10,0.18)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />

        <div className={`${pageShellClass} relative pt-10 md:pt-14`}>
          <div className="grid min-h-[calc(100svh-120px)] items-center gap-10 lg:grid-cols-[0.84fr_1.16fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[560px]"
            >
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/74">
                <span>쿠팡 · 스마트스토어 셀러용</span>
                <span className="text-white">Review Intelligence</span>
              </div>
              <div className="mt-8 max-w-[180px] text-[12px] uppercase tracking-[0.24em] text-white/44">ReviewBoost</div>
              <h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl md:leading-[0.94]">
                리뷰에서
                <br />
                매출을 막는 문제를
                <br />
                먼저 찾습니다
              </h1>
              <p className="mt-6 max-w-[520px] text-lg leading-8 text-[var(--color-muted)]">
                AI가 리뷰를 감정과 카테고리로 읽고, 지금 가장 먼저 해결해야 할 운영 이슈를 우선순위와 액션으로 정리합니다.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a className={primaryButtonClass} href="/dashboard/analyze">
                  지금 리뷰 분석 시작하기
                </a>
                <a className={secondaryButtonClass} href="/coupang-csv">
                  상품 URL로 리뷰 가져오기
                </a>
              </div>

              <div className="mt-8 grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-3">
                {[
                  ["오늘 무료", "5회 분석"],
                  ["평균 처리", "3분 이내"],
                  ["실행 결과", "액션과 시뮬레이션"]
                ].map(([label, value]) => (
                  <div key={label}>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
                    <div className="mt-2 text-base font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.84, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(143,212,255,0.34),transparent_72%)] blur-xl" />
              <AnalysisPreview />
            </motion.div>
          </div>
        </div>
      </section>

      <div className={pageShellClass}>
        <motion.section className="grid gap-12 pt-8 lg:grid-cols-[0.96fr_1.04fr]" {...reveal}>
          <SectionHeading
            eyebrow="Problem"
            title="리뷰는 쌓이는데, 운영 판단은 여전히 늦습니다."
            body="불만은 이미 리뷰 안에 남아 있지만 실제 운영 액션으로 연결되지 않는 경우가 많습니다. 결국 반복되는 문제가 방치되고 전환율과 평점이 함께 흔들립니다."
          />
          <div className="grid gap-4">
            {[
              ["고객은 이미 문제를 말합니다", "배송 지연, 품질 불만, 사용성 문제 같은 신호가 낮은 평점 리뷰에 반복적으로 쌓입니다."],
              ["하지만 팀은 무엇부터 고칠지 모릅니다", "리뷰가 흩어져 있어 실제 영향이 큰 문제와 급한 문제를 빠르게 구분하기 어렵습니다."],
              ["그래서 전환율 회복 타이밍을 놓칩니다", "상품 개선, 상세페이지 수정, CS 문구 정리가 뒤늦게 따라오면서 손실이 누적됩니다."]
            ].map(([title, body]) => (
              <Panel key={title} className="p-6">
                <h3 className="text-[28px] font-medium tracking-[-0.05em] text-white">{title}</h3>
                <p className="mt-3 text-base leading-8 text-[var(--color-muted)]">{body}</p>
              </Panel>
            ))}
          </div>
        </motion.section>

        <motion.section className="mt-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]" {...reveal}>
          <SectionHeading
            eyebrow="Workflow"
            title="수집부터 액션까지 하나의 흐름으로 묶었습니다."
            body="ReviewBoost는 리뷰 수집, 감정 분석, 카테고리 분류, 우선순위 계산, 개선 액션 연결까지 운영에 필요한 흐름을 하나의 화면 언어로 정리합니다."
          />
          <div className="space-y-4">
            {workflow.map(([index, title, body]) => (
              <div key={index} className="grid grid-cols-[52px_1fr] gap-4 border-t border-white/[0.08] py-5">
                <div className="pt-1 text-sm text-white/54">{index}</div>
                <div>
                  <div className="text-[28px] font-medium tracking-[-0.05em] text-white">{title}</div>
                  <p className="mt-2 text-base leading-8 text-[var(--color-muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

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
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="text-2xl font-medium text-white">Analysis dashboard</div>
                  <div className="rounded-full border border-white/[0.08] px-4 py-2 text-sm text-[var(--color-muted)]">최근 30일 기준</div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-4">
                  {[
                    ["Negative", "33%"],
                    ["Rating", "3.33"],
                    ["Priority", "46.7"],
                    ["Recent", "73%"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{label}</div>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 h-[240px] rounded-[26px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(143,212,255,0.1),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
                  <svg viewBox="0 0 640 220" className="h-full w-full">
                    <path d="M26 192 H614" stroke="rgba(255,255,255,0.08)" />
                    <path d="M26 148 H614" stroke="rgba(255,255,255,0.05)" />
                    <path d="M26 104 H614" stroke="rgba(255,255,255,0.05)" />
                    <motion.path
                      d="M38 184 C110 80, 156 132, 230 98 S338 72, 400 118 S510 154, 602 50"
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 1.1, ease: "easeInOut" }}
                    />
                    <defs>
                      <linearGradient id="lineGradient" x1="38" y1="184" x2="602" y2="50" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#9edfff" />
                        <stop offset="1" stopColor="#7486ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ["Urgent reviews", "최근 리뷰에서 품질과 배송 문제가 가장 자주, 가장 강하게 함께 등장합니다."],
                  ["Priority list", "품질 → 사용성 → 배송 순서로 대응하는 것이 평점 회복과 CS 감소에 가장 효율적입니다."],
                  ["Recommended actions", "상세페이지 상단 카피 정리, 포장 안정성 강조, 교환 안내 문구 보완이 즉시 실행 가능한 액션입니다."]
                ].map(([title, body]) => (
                  <Panel key={title} className="p-5">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/54">{title}</div>
                    <p className="mt-3 text-base leading-8 text-white/82">{body}</p>
                  </Panel>
                ))}
                <Panel className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/54">Expected recovery</div>
                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-sm text-[var(--color-muted)]">상위 문제 75% 개선 시</div>
                      <div className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-white">4.67</div>
                    </div>
                    <div className="rounded-full border border-amber-300/18 bg-amber-300/8 px-4 py-2 text-sm text-[var(--color-warning)]">+1.33 rating uplift</div>
                  </div>
                </Panel>
              </div>
            </div>
          </Panel>
        </motion.section>

        <motion.section className="mt-24 grid gap-12 lg:grid-cols-[0.95fr_1.05fr]" {...reveal}>
          <SectionHeading
            eyebrow="FAQ"
            title="도입 전에 가장 많이 확인하는 질문"
            body="무료 체험 범위, 도입 방식, 결과물 범위를 빠르게 확인할 수 있도록 정리했습니다."
          />
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <Panel key={question} className="p-6">
                <h3 className="text-[24px] font-medium tracking-[-0.05em] text-white">{question}</h3>
                <p className="mt-3 text-base leading-8 text-[var(--color-muted)]">{answer}</p>
              </Panel>
            ))}
          </div>
        </motion.section>

        <motion.section className="mt-24" {...reveal}>
          <Panel className="p-8 md:p-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[720px]">
                <Eyebrow>Start now</Eyebrow>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.98]">
                  가장 급한 문제부터
                  <br />
                  이번 주 안에 정리하세요
                </h2>
                <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
                  오늘 바로 5회 무료 분석이 가능합니다. 리뷰 CSV를 올리거나 상품 URL로 리뷰를 가져와 바로 시작하세요.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
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
