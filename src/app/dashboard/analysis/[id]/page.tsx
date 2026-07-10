import React from "react";
import { redirect } from "next/navigation";
import { PlanProvider } from "@/contexts/PlanContext";
import AnalysisResults from "@/components/features/dashboard/AnalysisResults";
import { buttonStyles } from "@/components/ui/Button";
import { StatePanel } from "@/components/ui/Primitives";
import { auth } from "@clerk/nextjs/server";
import { getAnalysisDetailForUser, getReviewsForAnalysis } from "@/lib/db/queries";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { getNavigationSessionState } from "@/lib/navigation_session";
import { monthlyLimitForPlan, planLabel } from "@/lib/plan";
import {
  mapLegacySavedAnalysisResult,
  mapSavedAnalysisResult,
  type SavedAnalysisDetailRow,
  type SavedAnalysisReviewRow
} from "@/lib/saved-analysis";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export default async function AnalysisDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const capabilitiesBase = getCapabilitiesBase();

  const { userId } = await auth();
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/dashboard/analysis/${id}`)}`);

  let detail: Awaited<ReturnType<typeof getAnalysisDetailForUser>> = null;
  let error: unknown = null;
  let session: Awaited<ReturnType<typeof getNavigationSessionState>>;
  try {
    [detail, session] = await Promise.all([
      getAnalysisDetailForUser(id, userId),
      getNavigationSessionState()
    ]);
  } catch (err) {
    error = err;
    session = await getNavigationSessionState();
  }

  const data: SavedAnalysisDetailRow | null = detail
    ? {
        id: detail.id,
        created_at: toIso(detail.createdAt) ?? new Date().toISOString(),
        input_filename: detail.inputFilename,
        priority_score: detail.priorityScore != null ? Number(detail.priorityScore) : null,
        stats: detail.stats as SavedAnalysisDetailRow["stats"],
        suggestions: detail.suggestions as SavedAnalysisDetailRow["suggestions"],
        result_payload: (detail.resultPayload ?? null) as SavedAnalysisDetailRow["result_payload"]
      }
    : null;

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
    databaseConfigured: true,
    authConfigured: true,
    openaiConfigured: capabilitiesBase.openaiConfigured,
    plan,
    planLabel: planDisplay,
    monthlyLimit: monthlyLimitForPlan(plan),
    monthlyUsed: 0,
    aiAdvancedAvailable: plan !== "free"
  };

  const reviewRows = await getReviewsForAnalysis(row.id, userId, 120);

  const reviews: SavedAnalysisReviewRow[] = reviewRows.map((r) => ({
    id: r.id,
    reviewed_at: toIso(r.reviewedAt),
    rating: r.rating,
    text: r.text,
    sentiment: r.sentiment as SavedAnalysisReviewRow["sentiment"],
    category: r.category as SavedAnalysisReviewRow["category"]
  }));
  const savedResult = mapSavedAnalysisResult(row);
  const unifiedResult = savedResult ?? mapLegacySavedAnalysisResult(row, reviews);
  const resultContext = savedResult
    ? { source: "saved_full" as const }
    : {
        source: "saved_legacy" as const,
        legacyNotice: "이 저장본은 이전 형식으로 저장되어 일부 섹션은 추정값 또는 비어 있는 상태로 표시됩니다.",
        unavailableSections: ["simulation", "positiveKeywords"] as const
      };

  return (
    <main className="pageMain">
      <PlanProvider plan={plan}>
        <AnalysisResults
          result={unifiedResult}
          caps={caps}
          busy={false}
          downloadHref={`/api/report/${row.id}`}
          headerDescription={`${created} · 우선순위 ${priorityScore.toFixed(1)} · ${planDisplay} 플랜`}
          secondaryHref="/dashboard"
          secondaryLabel="홈"
          resultContext={resultContext}
        />
      </PlanProvider>
    </main>
  );
}
