import React from "react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { mapDashboardHomeView, type DashboardHomeAnalysisRow } from "@/lib/dashboard-home-view";

export const dynamic = "force-dynamic";

function formatMetricValue(value: number | null, kind: "count" | "percent" | "rating") {
  if (kind === "count") return `${value ?? 0}`;
  if (value === null || !Number.isFinite(value)) return "-";
  if (kind === "percent") return `${Math.round(value * 100)}%`;
  return `${value.toFixed(2)} / 5`;
}

function EmptyHomeState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))] px-5 py-7 md:px-7">
      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/analyze" className={buttonStyles({ variant: "primary" })}>
          AI분석 시작
        </Link>
        <Link href="/coupang-csv" className={buttonStyles({ variant: "ghost" })}>
          URL로 CSV 받기
        </Link>
      </div>
    </section>
  );
}

export default async function DashboardHomePage() {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>> | null = null;

  try {
    supabase = await createSupabaseServerComponentClient();
  } catch {
    supabase = null;
  }

  if (!supabase) {
    return (
      <main className="pageMain space-y-8">
        <section className="grid gap-4 rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))] px-5 py-6 md:grid-cols-4 md:px-7">
          {[
            { label: "총 리뷰", value: "0" },
            { label: "부정비율", value: "-" },
            { label: "평균 별점", value: "-" },
            { label: "최근 30일 비중", value: "-" }
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">{item.label}</p>
              <strong className="mt-3 block text-[clamp(1.8rem,3vw,2.6rem)] font-semibold tracking-[-0.05em] text-white">{item.value}</strong>
            </div>
          ))}
        </section>
        <EmptyHomeState title="여기도 채워주세요" description="저장 기능이 비활성화되어 있어 누적 홈 통계는 표시되지 않습니다. 분석은 계속 진행할 수 있습니다." />
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return (
      <main className="pageMain space-y-8">
        <section className="grid gap-4 rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))] px-5 py-6 md:grid-cols-4 md:px-7">
          {[
            { label: "총 리뷰", value: "0" },
            { label: "부정비율", value: "-" },
            { label: "평균 별점", value: "-" },
            { label: "최근 30일 비중", value: "-" }
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">{item.label}</p>
              <strong className="mt-3 block text-[clamp(1.8rem,3vw,2.6rem)] font-semibold tracking-[-0.05em] text-white">{item.value}</strong>
            </div>
          ))}
        </section>
        <EmptyHomeState title="여기도 채워주세요" description="로그인하면 지금까지 분석한 리뷰의 누적 통계와 이전 결과 목록을 홈에서 바로 볼 수 있습니다." />
      </main>
    );
  }

  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, priority_score, stats")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main className="pageMain">
        <EmptyHomeState title="문제가 발생했어요" description="저장된 분석을 불러오지 못했습니다. 잠시 후 다시 시도하거나 바로 새 분석을 시작해 주세요." />
      </main>
    );
  }

  const view = mapDashboardHomeView((data ?? []) as DashboardHomeAnalysisRow[]);
  const metrics = [
    { label: "총 리뷰", value: formatMetricValue(view.totalReviews, "count") },
    { label: "부정비율", value: formatMetricValue(view.negativeRate, "percent") },
    { label: "평균 별점", value: formatMetricValue(view.averageRating, "rating") },
    { label: "최근 30일 비중", value: formatMetricValue(view.recent30DayWeight, "percent") }
  ];

  return (
    <main className="pageMain space-y-8">
      <section className="grid gap-4 rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))] px-5 py-6 md:grid-cols-4 md:px-7">
        {metrics.map((item) => (
          <div key={item.label}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">{item.label}</p>
            <strong className="mt-3 block text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-white">{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="rounded-[28px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))] px-5 py-6 md:px-7">
        <div className="flex flex-col gap-4 border-b border-[color:rgba(222,230,242,0.08)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Previous analyses</p>
            <h2 className="mt-3 text-[clamp(1.8rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-white">이전 분석 결과</h2>
          </div>
          <Link href="/dashboard/analyze" className={buttonStyles({ variant: "secondary" })}>
            새 분석
          </Link>
        </div>

        {view.recentReports.length === 0 ? (
          <p className="mt-6 text-sm leading-7 text-[var(--rb-muted-strong)]">
            저장된 분석이 없습니다. 먼저 AI분석 화면에서 CSV를 업로드해 첫 결과를 만들어 주세요.
          </p>
        ) : (
          <div className="mt-4 border-t border-[color:rgba(222,230,242,0.08)]">
            {view.recentReports.map((report) => (
              <Link
                key={report.id}
                href={report.href}
                className="grid gap-3 border-b border-[color:rgba(222,230,242,0.08)] py-5 transition hover:bg-[rgba(255,255,255,0.015)] md:grid-cols-[minmax(0,1.1fr)_120px_120px_120px_40px] md:items-center"
              >
                <div>
                  <strong className="block text-base font-semibold tracking-[-0.03em] text-white">{report.title}</strong>
                  <span className="mt-1 block text-xs text-[var(--rb-muted)]">{report.createdLabel}</span>
                </div>
                <div className="text-sm text-[var(--rb-muted-strong)]">{report.totalReviewsLabel}</div>
                <div className="text-sm text-[var(--rb-muted-strong)]">{report.negativeRateLabel}</div>
                <div className="text-sm text-[var(--rb-muted-strong)]">Priority {report.priorityLabel}</div>
                <span className="text-right text-2xl text-[var(--rb-muted)]" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
