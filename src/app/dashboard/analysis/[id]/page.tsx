import React from "react";
import { redirect } from "next/navigation";
import { PlanProvider } from "@/contexts/PlanContext";
import AnalysisResults from "@/components/features/dashboard/AnalysisResults";
import { buttonStyles } from "@/components/ui/Button";
import { StatePanel } from "@/components/ui/Primitives";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { getNavigationSessionState } from "@/lib/navigation_session";
import { monthlyLimitForPlan, planLabel } from "@/lib/plan";
import { isResultPayloadSchemaMismatch } from "@/lib/result-payload-compat";
import {
  mapLegacySavedAnalysisResult,
  mapSavedAnalysisResult,
  type SavedAnalysisDetailRow,
  type SavedAnalysisReviewRow
} from "@/lib/saved-analysis";

export const dynamic = "force-dynamic";

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
    databaseConfigured: true,
    authConfigured: true,
    openaiConfigured: capabilitiesBase.openaiConfigured,
    plan,
    planLabel: planDisplay,
    monthlyLimit: monthlyLimitForPlan(plan),
    monthlyUsed: 0,
    aiAdvancedAvailable: plan !== "free"
  };

  const { data: reviewRows } = await supabase
    .from("reviews")
    .select("id, reviewed_at, rating, text, sentiment, category")
    .eq("analysis_id", row.id)
    .order("reviewed_at", { ascending: false })
    .limit(120);

  const reviews = (reviewRows ?? []) as SavedAnalysisReviewRow[];
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
          onDownloadPdf={() => {}}
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
