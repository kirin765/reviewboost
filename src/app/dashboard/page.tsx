import React from "react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { auth } from "@clerk/nextjs/server";
import { listAnalysesForUser } from "@/lib/db/queries";
import { maybeAlertNewSignup } from "@/lib/notify/signup-alert";
import { isDatabaseConfigured } from "@/lib/capabilities";
import { mapDashboardHomeView, type DashboardHomeAnalysisRow } from "@/lib/dashboard-home-view";
import { EXTENSION_STORE_URL } from "@/lib/extension";

export const dynamic = "force-dynamic";

function formatMetricValue(value: number | null, kind: "count" | "percent" | "rating") {
  if (kind === "count") return `${value ?? 0}`;
  if (value === null || !Number.isFinite(value)) return "-";
  if (kind === "percent") return `${Math.round(value * 100)}%`;
  return `${value.toFixed(2)} / 5`;
}

function buildLinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 0.01);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function OverviewMetricBand({
  metrics,
  title,
  description
}: {
  metrics: Array<{ label: string; value: string; detail?: string }>;
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-[28px] border border-[color:#e6e8f2] bg-white p-6 md:p-7">
      <div className="flex flex-col gap-4 border-b border-[color:#e6e8f2] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">작업 개요</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">{item.label}</p>
            <strong className="mt-3 block text-[clamp(1.9rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{item.value}</strong>
            {item.detail ? <p className="mt-2 text-sm text-[var(--rb-muted-strong)]">{item.detail}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendSurface({
  title,
  description,
  points
}: {
  title: string;
  description: string;
  points: Array<{ id: string; label: string; negativeRate: number; averageRating: number | null; total: number }>;
}) {
  const chartWidth = 420;
  const chartHeight = 180;
  const linePath = buildLinePath(points.map((point) => point.negativeRate * 100), chartWidth, chartHeight);
  const areaPath = linePath ? `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z` : "";

  return (
    <section className="rounded-[28px] border border-[color:#e6e8f2] bg-white p-6 md:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">최근 추이</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{title}</h2>
        </div>
        <p className="max-w-xs text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
      </div>

      {points.length > 0 ? (
        <>
          <div className="mt-6 overflow-hidden rounded-[22px] border border-[color:#e6e8f2] bg-white p-4">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[220px] w-full" role="img" aria-label="최근 분석 부정 비율 추세">
              <defs>
                <linearGradient id="dashboardTrendArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(91,92,234,0.22)" />
                  <stop offset="100%" stopColor="rgba(91,92,234,0.01)" />
                </linearGradient>
              </defs>
              {Array.from({ length: 5 }).map((_, index) => {
                const y = (chartHeight / 4) * index;
                return <line key={index} x1="0" y1={y} x2={chartWidth} y2={y} stroke="rgba(31,37,64,0.08)" strokeDasharray="3 5" />;
              })}
              {Array.from({ length: points.length }).map((_, index) => {
                const x = points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth;
                return <line key={index} x1={x} y1="0" x2={x} y2={chartHeight} stroke="rgba(31,37,64,0.06)" />;
              })}
              {areaPath ? <path d={areaPath} fill="url(#dashboardTrendArea)" /> : null}
              {linePath ? <path d={linePath} fill="none" stroke="var(--rb-accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </svg>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {points.slice(-3).map((point) => (
              <div key={point.id} className="rounded-[16px] border border-[color:#e6e8f2] bg-white px-4 py-3">
                <p className="text-xs text-[var(--rb-muted)]">{point.label}</p>
                <strong className="mt-2 block text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{Math.round(point.negativeRate * 100)}%</strong>
                <p className="mt-1 text-xs text-[var(--rb-muted-strong)]">{point.total}건 분석</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-[22px] border border-[color:#e6e8f2] bg-white p-6 text-sm leading-7 text-[var(--rb-muted-strong)]">
          아직 누적된 분석이 없어 추세선이 비어 있습니다. 첫 분석을 저장하면 최근 부정 비율의 흐름이 이 영역에 표시됩니다.
        </div>
      )}
    </section>
  );
}

function CompositionSurface({
  negativeReviews,
  nonNegativeReviews,
  recent30DayWeight
}: {
  negativeReviews: number;
  nonNegativeReviews: number;
  recent30DayWeight: number | null;
}) {
  const total = Math.max(negativeReviews + nonNegativeReviews, 1);
  const negativeAngle = (negativeReviews / total) * 360;
  const recentShare = recent30DayWeight === null ? 0 : recent30DayWeight;

  return (
    <section className="rounded-[28px] border border-[color:#e6e8f2] bg-white p-6 md:p-7">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">리뷰 구성</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">리뷰 구성 비율</h2>
      <div className="mt-6 flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div
          className="h-[220px] w-[220px] rounded-full border border-[color:#e6e8f2]"
          style={{
            background: `conic-gradient(var(--rb-accent) 0deg ${negativeAngle}deg, #eef0f8 deg 360deg)`
          }}
          aria-hidden="true"
        >
          <div className="m-[26px] flex h-[168px] w-[168px] items-center justify-center rounded-full bg-[var(--rb-bg)]">
            <div className="text-center">
              <strong className="block text-[2rem] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{Math.round((negativeReviews / total) * 100)}%</strong>
              <span className="text-sm text-[var(--rb-muted)]">부정 리뷰</span>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="rounded-[16px] border border-[color:#e6e8f2] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--rb-muted-strong)]">부정 리뷰</span>
              <strong className="text-lg font-semibold text-[var(--rb-fg)]">{negativeReviews}건</strong>
            </div>
          </div>
          <div className="rounded-[16px] border border-[color:#e6e8f2] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--rb-muted-strong)]">긍정·중립 리뷰</span>
              <strong className="text-lg font-semibold text-[var(--rb-fg)]">{nonNegativeReviews}건</strong>
            </div>
          </div>
          <div className="rounded-[16px] border border-[color:#e6e8f2] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[var(--rb-muted-strong)]">최근 30일 비중</span>
              <strong className="text-lg font-semibold text-[var(--rb-fg)]">{recent30DayWeight === null ? "-" : `${Math.round(recentShare * 100)}%`}</strong>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[var(--rb-accent)]" style={{ width: `${Math.max(recentShare * 100, recentShare > 0 ? 4 : 0)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EmptyHomeState({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[28px] border border-[color:#e6e8f2] bg-white px-5 py-7 md:px-7">
      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/analyze" className={buttonStyles({ variant: "primary" })}>
          AI분석 시작
        </Link>
        <a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "ghost" })}>
          Chrome 확장프로그램 설치
        </a>
      </div>
    </section>
  );
}

function HomeListSection({
  recentReports
}: {
  recentReports: Array<{
    id: string;
    href: string;
    title: string;
    createdLabel: string;
    totalReviewsLabel: string;
    negativeRateLabel: string;
    priorityLabel: string;
  }>;
}) {
  return (
    <section className="rounded-[28px] border border-[color:#e6e8f2] bg-white px-5 py-6 md:px-7">
      <div className="flex flex-col gap-4 border-b border-[color:#e6e8f2] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">이전 분석 결과</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">이전 분석 결과</h2>
        </div>
        <Link href="/dashboard/analyze" className={buttonStyles({ variant: "secondary" })}>
          새 분석
        </Link>
      </div>

      {recentReports.length === 0 ? (
        <p className="mt-6 text-sm leading-7 text-[var(--rb-muted-strong)]">
          저장된 분석이 없습니다. 먼저 AI분석 화면에서 CSV를 업로드해 첫 결과를 만들어 주세요.
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[18px] border border-[color:#e6e8f2]">
          <div className="hidden grid-cols-[minmax(0,1.1fr)_120px_120px_120px_100px] gap-3 border-b border-[color:#e6e8f2] bg-white px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--rb-muted)] md:grid">
            <span>파일</span>
            <span>총 리뷰</span>
            <span>부정비율</span>
            <span>우선순위</span>
            <span>생성일</span>
          </div>
          {recentReports.map((report) => (
            <Link
              key={report.id}
              href={report.href}
              className="grid gap-3 border-b border-[color:#e6e8f2] px-4 py-5 transition last:border-b-0 hover:bg-white md:grid-cols-[minmax(0,1.1fr)_120px_120px_120px_100px] md:items-center"
            >
              <div>
                <strong className="block text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{report.title}</strong>
                <span className="mt-1 block text-xs text-[var(--rb-muted)] md:hidden">{report.createdLabel}</span>
              </div>
              <span className="text-sm text-[var(--rb-muted-strong)]">{report.totalReviewsLabel}</span>
              <span className="text-sm text-[var(--rb-muted-strong)]">{report.negativeRateLabel}</span>
              <span className="text-sm text-[var(--rb-muted-strong)]">{report.priorityLabel}</span>
              <span className="text-sm text-[var(--rb-muted)]">{report.createdLabel}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DashboardHomePage() {
  const databaseConfigured = isDatabaseConfigured();

  let userId: string | null = null;
  try {
    const { userId: uid } = await auth();
    userId = uid ?? null;
  } catch {
    userId = null;
  }

  const zeroMetrics = [
    { label: "총 리뷰", value: "0" },
    { label: "부정비율", value: "-" },
    { label: "평균 별점", value: "-" },
    { label: "최근 30일 비중", value: "-" }
  ];

  if (!databaseConfigured) {
    return (
      <main className="pageMain space-y-6">
        <OverviewMetricBand
          title="누적 분석 홈"
          description="저장 기능이 비활성화된 환경이라 차트와 누적 통계는 비어 있습니다."
          metrics={zeroMetrics}
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <TrendSurface title="부정 비율 추세" description="저장된 분석이 생기면 최근 부정 비율의 흐름을 이 영역에서 읽습니다." points={[]} />
          <CompositionSurface negativeReviews={0} nonNegativeReviews={0} recent30DayWeight={null} />
        </div>
        <EmptyHomeState title="여기도 채워주세요" description="저장 기능이 비활성화되어 있어 누적 홈 통계는 표시되지 않습니다. 분석은 계속 진행할 수 있습니다." />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="pageMain space-y-6">
        <OverviewMetricBand
          title="누적 분석 홈"
          description="로그인하면 저장된 분석을 기준으로 운영 지표와 추세 차트가 채워집니다."
          metrics={zeroMetrics}
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <TrendSurface title="부정 비율 추세" description="아직 로그인하지 않아 최근 분석 추세를 불러오지 못했습니다." points={[]} />
          <CompositionSurface negativeReviews={0} nonNegativeReviews={0} recent30DayWeight={null} />
        </div>
        <EmptyHomeState title="여기도 채워주세요" description="로그인하면 지금까지 분석한 리뷰의 누적 통계와 이전 결과 목록을 홈에서 바로 볼 수 있습니다." />
      </main>
    );
  }

  // Fire a one-time Telegram alert for brand-new signups landing here.
  await maybeAlertNewSignup();

  let rows: DashboardHomeAnalysisRow[];
  try {
    const items = await listAnalysesForUser(userId, 50);
    rows = items.map((item) => ({
      id: item.id,
      created_at: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
      input_filename: item.inputFilename,
      priority_score: item.priorityScore === null ? null : Number(item.priorityScore),
      stats: item.stats as DashboardHomeAnalysisRow["stats"]
    }));
  } catch {
    return (
      <main className="pageMain">
        <EmptyHomeState title="문제가 발생했어요" description="저장된 분석을 불러오지 못했습니다. 잠시 후 다시 시도하거나 바로 새 분석을 시작해 주세요." />
      </main>
    );
  }

  const view = mapDashboardHomeView(rows);
  const metrics = [
    { label: "총 리뷰", value: formatMetricValue(view.totalReviews, "count"), detail: "누적 저장 분석 기준" },
    { label: "부정비율", value: formatMetricValue(view.negativeRate, "percent"), detail: `${view.negativeReviews}건 부정 리뷰` },
    { label: "평균 별점", value: formatMetricValue(view.averageRating, "rating"), detail: "가중 평균" },
    { label: "최근 30일 비중", value: formatMetricValue(view.recent30DayWeight, "percent"), detail: "최근성 신호" }
  ];

  return (
    <main className="pageMain space-y-6">
      <OverviewMetricBand
        title="누적 분석 홈"
        description="지금까지 저장된 분석을 기준으로 최근 흐름과 구성 비율을 같이 읽어, 다시 분석할 대상과 우선순위를 빠르게 판단합니다."
        metrics={metrics}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <TrendSurface
          title="최근 분석 부정 비율"
          description="최근 저장된 분석 8~12건의 부정 비율 변화를 읽고, 언제 악화됐는지 빠르게 확인합니다."
          points={view.trend}
        />
        <CompositionSurface
          negativeReviews={view.negativeReviews}
          nonNegativeReviews={view.nonNegativeReviews}
          recent30DayWeight={view.recent30DayWeight}
        />
      </div>

      <HomeListSection recentReports={view.recentReports} />
    </main>
  );
}
