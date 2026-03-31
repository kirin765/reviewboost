import React from "react";
import { redirect } from "next/navigation";
import { PlanProvider } from "@/contexts/PlanContext";
import AnalysisResults from "@/components/features/dashboard/AnalysisResults";
import { buttonStyles } from "@/components/ui/Button";
import { StatePanel, Surface } from "@/components/ui/Primitives";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { getNavigationSessionState } from "@/lib/navigation_session";
import { monthlyLimitForPlan, planLabel } from "@/lib/plan";
import { isResultPayloadSchemaMismatch } from "@/lib/result-payload-compat";
import {
  mapLegacySavedAnalysisView,
  mapSavedAnalysisResult,
  type SavedAnalysisDetailRow,
  type SavedAnalysisReviewRow
} from "@/lib/saved-analysis";

export const dynamic = "force-dynamic";

function sentimentBadge(sentiment: "positive" | "negative" | "neutral") {
  if (sentiment === "negative") {
    return "border-[color:rgba(255,138,138,0.2)] bg-[rgba(255,138,138,0.1)] text-[#ffc0c0]";
  }
  if (sentiment === "positive") {
    return "border-[color:rgba(107,210,193,0.2)] bg-[rgba(107,210,193,0.1)] text-[#a8ece1]";
  }
  return "border-[color:rgba(132,162,255,0.18)] bg-[rgba(132,162,255,0.1)] text-[#becbff]";
}

function legacySuggestionTone(title: string) {
  if (title.includes("CS")) return "border-[color:rgba(107,210,193,0.18)] bg-[rgba(107,210,193,0.06)]";
  if (title.includes("FAQ")) return "border-[color:rgba(132,162,255,0.18)] bg-[rgba(132,162,255,0.06)]";
  if (title.includes("상세페이지")) return "border-[color:rgba(245,185,110,0.18)] bg-[rgba(245,185,110,0.06)]";
  return "border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]";
}

async function loadSavedAnalysisRow({
  supabase,
  analysisId,
  userId
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>;
  analysisId: string;
  userId: string;
}) {
  const baseQuery = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, stats, suggestions, priority_score")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .single();

  if (baseQuery.error || !baseQuery.data) {
    return {
      data: null,
      error: baseQuery.error ?? { message: "missing" }
    };
  }

  const payloadQuery = await supabase
    .from("analyses")
    .select("result_payload")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .single();

  if (payloadQuery.error && !isResultPayloadSchemaMismatch(payloadQuery.error)) {
    return {
      data: null,
      error: payloadQuery.error
    };
  }

  return {
    data: {
      ...baseQuery.data,
      result_payload: payloadQuery.error ? null : payloadQuery.data?.result_payload ?? null
    } satisfies SavedAnalysisDetailRow,
    error: null
  };
}

export default async function AnalysisDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const capabilitiesBase = getCapabilitiesBase();
  let supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>> | null = null;

  try {
    supabase = await createSupabaseServerComponentClient();
  } catch {
    supabase = null;
  }

  if (!supabase) {
    return (
      <main className="pageMain">
        <StatePanel
          title="저장 기능이 비활성화되어 있습니다"
          description="지금은 저장 기능이 꺼져 있어 이 페이지를 사용할 수 없습니다. 대시보드에서 분석 후 PDF를 바로 공유용 리포트로 사용할 수 있습니다."
          actions={
            <>
              <a className={buttonStyles({ variant: "primary" })} href="/dashboard">
                새 분석
              </a>
              <a className={buttonStyles({ variant: "secondary" })} href="/help">
                사용법
              </a>
            </>
          }
        />
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=${encodeURIComponent(`/dashboard/analysis/${id}`)}`);

  const [{ data, error }, session] = await Promise.all([
    loadSavedAnalysisRow({
      supabase,
      analysisId: id,
      userId: userData.user.id
    }),
    getNavigationSessionState()
  ]);

  if (error || !data) {
    return (
      <main className="pageMain">
        <StatePanel
          title="문제가 발생했어요"
          description="분석을 찾을 수 없거나 접근 권한이 없습니다."
          tone="error"
          actions={
            <a className={buttonStyles({ variant: "secondary" })} href="/dashboard">
              홈
            </a>
          }
        />
      </main>
    );
  }

  const row = data as SavedAnalysisDetailRow;
  const created = new Date(row.created_at).toLocaleString("ko-KR");
  const priorityScore = Number(row.priority_score ?? 0);
  const plan = session.plan;
  const planDisplay = planLabel(plan);

  const caps = {
    supabaseConfigured: true,
    openaiConfigured: capabilitiesBase.openaiConfigured,
    plan,
    planLabel: planDisplay,
    monthlyLimit: monthlyLimitForPlan(plan),
    monthlyUsed: 0,
    aiAdvancedAvailable: plan !== "free"
  };

  const savedResult = mapSavedAnalysisResult(row);

  if (savedResult) {
    return (
      <main className="pageMain">
        <PlanProvider plan={plan}>
          <AnalysisResults
            result={savedResult}
            caps={caps}
            busy={false}
            onDownloadPdf={() => {}}
            downloadHref={`/api/report/${row.id}`}
            headerDescription={`${created} · 우선순위 ${priorityScore.toFixed(1)} · ${planDisplay} 플랜`}
            secondaryHref="/dashboard"
            secondaryLabel="홈"
          />
        </PlanProvider>
      </main>
    );
  }

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, reviewed_at, rating, text, sentiment, category")
    .eq("analysis_id", row.id)
    .order("reviewed_at", { ascending: false })
    .limit(120);

  const legacyView = mapLegacySavedAnalysisView(row, (reviewRows ?? []) as SavedAnalysisReviewRow[]);

  return (
    <main className="pageMain space-y-6">
      <Surface className="px-6 py-6 md:px-7">
        <div className="flex flex-col gap-4 border-b border-[color:rgba(255,255,255,0.06)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">저장된 분석</p>
            <h1 className="mt-3 text-[clamp(2rem,3.5vw,3.4rem)] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">
              {row.input_filename ?? "저장된 분석"}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--rb-muted-strong)]">
              {created} · 우선순위 {priorityScore.toFixed(1)} · 이 저장본은 이전 스키마로 보관되어 일부 고급 섹션이 축약 표시됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href={`/api/report/${row.id}`}>
              PDF 다운로드
            </a>
            <a className={buttonStyles({ variant: "secondary" })} href="/dashboard">
              홈
            </a>
            <a className={buttonStyles({ variant: "ghost" })} href="/dashboard/analyze">
              AI분석
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {legacyView.summary.map((item) => (
            <div key={item.label} className="rounded-[18px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">{item.label}</p>
              <strong className="mt-3 block text-[2rem] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{item.value}</strong>
              <p className="mt-2 text-sm text-[var(--rb-muted-strong)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">저장된 리뷰 흐름</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">저장된 리뷰와 핵심 키워드</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {legacyView.categories.map((category) => (
                <div key={category.label} className="rounded-[16px] border border-[color:rgba(245,185,110,0.18)] bg-[rgba(245,185,110,0.06)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-base tracking-[-0.03em] text-[var(--rb-fg)]">{category.label}</strong>
                    <span className="text-xs text-[var(--rb-muted)]">{category.share}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <div className="h-full rounded-full bg-[var(--rb-accent)]" style={{ width: category.share }} />
                  </div>
                  <p className="mt-3 text-sm text-[var(--rb-muted-strong)]">{category.count}건</p>
                </div>
              ))}
            </div>

            <section className="mt-8 border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">부정 키워드</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {(row.stats?.negativeKeywordsTop10 ?? []).map((item) => (
                  <div
                    key={item.keyword}
                    data-tone="keyword"
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-[color:rgba(245,185,110,0.18)] bg-[rgba(245,185,110,0.06)] px-4 py-3 text-sm"
                  >
                    <span className="text-[var(--rb-fg)]">{item.keyword}</span>
                    <span className="text-[var(--rb-muted)]">{item.count}건</span>
                  </div>
                ))}
                {(row.stats?.negativeKeywordsTop10 ?? []).length === 0 ? (
                  <p className="text-sm text-[var(--rb-muted)]">저장된 부정 키워드가 없습니다.</p>
                ) : null}
              </div>
            </section>

            <section className="mt-8 border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">리뷰 피드</p>
              <div className="mt-5 space-y-4">
                {legacyView.reviews.map((review) => (
                  <article
                    key={review.id}
                    data-tone="review"
                    className="rounded-[16px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--rb-muted)]">
                      <span className="rounded-full border border-[color:rgba(255,255,255,0.08)] px-3 py-1">{review.category}</span>
                      <span className={`rounded-full border px-3 py-1 ${sentimentBadge(review.sentiment)}`}>
                        {review.sentiment === "negative" ? "부정" : review.sentiment === "positive" ? "긍정" : "중립"}
                      </span>
                      <span className="rounded-full border border-[color:rgba(255,255,255,0.08)] px-3 py-1">{review.ratingLabel}</span>
                      <span>{review.reviewedLabel}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-fg)]">{review.text}</p>
                  </article>
                ))}
                {legacyView.reviews.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">저장된 리뷰 본문이 없습니다.</p> : null}
              </div>
            </section>
          </div>

          <div className="space-y-6 border-t border-[color:rgba(255,255,255,0.06)] pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <section>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">저장 형식 안내</p>
              <div
                data-tone="legacy-note"
                className="mt-4 rounded-[18px] border border-[color:rgba(132,162,255,0.2)] bg-[rgba(132,162,255,0.08)] p-4 text-sm leading-7 text-[var(--rb-muted-strong)]"
              >
                이 저장본은 긴급 리뷰, 우선순위 매트릭스, 개선 시뮬레이션, 액션 아이템이 함께 저장되기 전 결과입니다. 새 분석부터는 라이브 결과 화면과 거의 같은 상세가 보존됩니다.
              </div>
            </section>

            {legacyView.suggestionGroups.map((group) => (
              <section
                key={group.title}
                data-tone="suggestion"
                className={`rounded-[18px] border p-5 ${legacySuggestionTone(group.title)}`}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">활용 제안</p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{group.title}</h2>
                <div className="mt-4 space-y-3">
                  {group.items.length > 0 ? (
                    group.items.map((item, index) => (
                      <p key={`${group.title}-${index}`} className="border-b border-[color:rgba(255,255,255,0.06)] pb-3 text-sm leading-7 text-[var(--rb-muted-strong)] last:border-b-0 last:pb-0">
                        {item}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--rb-muted)]">저장된 제안이 없습니다.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Surface>
    </main>
  );
}
