import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server";
import { Eyebrow, Panel, SectionHeading, pageShellClass, primaryButtonClass, secondaryButtonClass } from "@/components/marketing/MarketingPrimitives";

export const metadata: Metadata = {
  title: "사용법 - ReviewBoost CSV 업로드 & 리뷰 분석 가이드",
  description: "ReviewBoost 사용법을 단계별로 안내합니다. CSV 준비, 열 매핑, AI 분석, PDF 리포트 다운로드까지 2분이면 시작할 수 있습니다.",
  alternates: { canonical: "/help" }
};

export default async function HelpPage() {
  const { t } = await getServerTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "리뷰가 너무 많으면 어떻게 되나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "대량 리뷰는 샘플링하여 분석합니다. Basic 이상은 180건, Pro는 대량 우선 처리됩니다."
        }
      },
      {
        "@type": "Question",
        name: "분석 결과는 어디서 보나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "분석 완료 후 화면에 바로 표시되며, PDF로도 다운로드 가능합니다."
        }
      },
      {
        "@type": "Question",
        name: "로그인 없이도 분석 가능한가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "네, 로그인 없이도 CSV만 업로드하면 분석을 진행할 수 있습니다."
        }
      }
    ]
  };

  const steps = [t("help.step1"), t("help.step2"), t("help.step3"), t("help.step4")];

  return (
    <main className={`${pageShellClass} pt-12`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="grid gap-10 lg:grid-cols-[0.94fr_1.06fr] lg:items-end">
        <div className="max-w-[650px]">
          <Eyebrow>Guide</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl md:leading-[0.95]">
            첫 분석까지
            <br />
            2분 안에 도달하도록
            <br />
            흐름을 단순화했습니다
          </h1>
          <p className="mt-6 text-base leading-8 text-[var(--color-muted)]">{t("help.pageLead")}</p>
        </div>
        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Step {index + 1}</div>
                <div className="mt-3 text-base font-medium text-white">{step}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-20 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6 md:p-7">
          <div className="max-w-[520px]">
            <Eyebrow>CSV prep</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">{t("help.csvPrepTitle")}</h2>
            <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">{t("help.csvSaveHint")}</p>
          </div>
          <div className="mt-8 space-y-4">
            {[
              [t("help.csvRequired"), t("help.csvRequiredValue")],
              [t("help.csvRecommended"), t("help.csvRecommendedValue")],
              [t("help.csvOptional"), t("help.csvOptionalValue")]
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-5 border-t border-white/[0.08] py-4 first:border-t-0 first:pt-0">
                <div className="text-sm text-white">{label}</div>
                <div className="max-w-[55%] text-right text-sm leading-7 text-[var(--color-muted)]">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className={primaryButtonClass} href="/sample.csv" download>{t("help.sampleCsvFull")}</a>
            <a className={secondaryButtonClass} href="/sample_simple.csv" download>{t("help.sampleCsvSimple")}</a>
          </div>
        </Panel>

        <Panel className="p-6 md:p-7">
          <div className="max-w-[520px]">
            <Eyebrow>Upload</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">{t("help.uploadTitle")}</h2>
            <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">{t("help.uploadLead")}</p>
          </div>
          <div className="mt-8 rounded-[24px] border border-dashed border-white/[0.12] bg-white/[0.03] p-6">
            <div className="text-sm uppercase tracking-[0.18em] text-white/42">Upload zone</div>
            <p className="mt-4 text-base leading-8 text-white/86">{t("help.uploadHint")}</p>
            <p className="mt-6 text-sm leading-7 text-[var(--color-muted)]">CSV를 업로드하면 리뷰 텍스트, 별점, 작성일 컬럼 후보를 자동으로 추정합니다.</p>
          </div>
        </Panel>
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionHeading eyebrow="Results" title={t("help.resultsTitle")} body={t("help.resultsLead")} />
        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              t("help.resultItem1"),
              t("help.resultItem2"),
              t("help.resultItem3"),
              t("help.resultItem4"),
              t("help.resultItem5"),
              t("help.resultItem6"),
              t("help.resultItem7")
            ].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 text-sm leading-7 text-white/84">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-[var(--color-muted)]">{t("help.resultsHint")}</p>
          <div className="mt-8">
            <a className={primaryButtonClass} href="/dashboard/analyze">{t("help.analyzeNow")}</a>
          </div>
        </Panel>
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionHeading eyebrow="Storage" title={t("help.saveTitle")} body={t("help.saveLead")} />
        <Panel className="p-6 md:p-7">
          <p className="text-base leading-8 text-[var(--color-muted)]">{t("help.saveHint")}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {["Free는 빠른 테스트", "Basic은 반복 분석 저장", "Pro는 전체 액션 공유"].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 text-sm leading-7 text-white/84">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionHeading eyebrow="FAQ" title={t("help.faqTitle")} body="시작 전에 가장 자주 확인하는 내용을 정리했습니다." />
        <div className="space-y-4">
          {[
            [t("help.faq1Q"), t("help.faq1A")],
            [t("help.faq2Q"), t("help.faq2A")],
            [t("help.faq3Q"), t("help.faq3A")]
          ].map(([question, answer]) => (
            <Panel key={question} className="p-6">
              <h3 className="text-[24px] font-medium tracking-[-0.05em] text-white">{question}</h3>
              <p className="mt-3 text-base leading-8 text-[var(--color-muted)]">{answer}</p>
            </Panel>
          ))}
        </div>
      </section>
    </main>
  );
}
