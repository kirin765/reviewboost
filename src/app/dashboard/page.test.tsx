import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockCreateSupabaseServerComponentClient } = vi.hoisted(() => ({
  mockCreateSupabaseServerComponentClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerComponentClient: mockCreateSupabaseServerComponentClient
}));

import DashboardHomePage from "./page";

type DashboardRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: {
    total: number;
    negative: number;
    negativeRatio: number;
    avgRating: number | null;
    recentness: {
      hasDates: boolean;
      last30Share: number;
    };
  } | null;
};

function createSupabaseMock({
  user,
  rows = [],
  error = null
}: {
  user: { id: string } | null;
  rows?: DashboardRow[];
  error?: unknown;
}) {
  const query = {
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn()
  };

  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: rows, error });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } })
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(query)
    })
  };
}

async function renderDashboardHomePage() {
  const element = await DashboardHomePage();
  return renderToStaticMarkup(element);
}

describe("/dashboard home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders aggregate metrics and previous analysis rows", async () => {
    const rows: DashboardRow[] = [
      {
        id: "analysis-1",
        created_at: "2026-03-30T09:00:00.000Z",
        input_filename: "march_reviews.csv",
        priority_score: 61.4,
        stats: {
          total: 100,
          negative: 30,
          negativeRatio: 0.3,
          avgRating: 3.5,
          recentness: { hasDates: true, last30Share: 0.8 }
        }
      },
      {
        id: "analysis-2",
        created_at: "2026-03-29T09:00:00.000Z",
        input_filename: "april_reviews.csv",
        priority_score: 42.1,
        stats: {
          total: 50,
          negative: 10,
          negativeRatio: 0.2,
          avgRating: 4.1,
          recentness: { hasDates: true, last30Share: 0.4 }
        }
      }
    ];

    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        rows
      })
    );

    const html = await renderDashboardHomePage();

    expect(html).toContain("총 리뷰");
    expect(html).toContain(">150<");
    expect(html).toContain("부정비율");
    expect(html).toContain(">27%<");
    expect(html).toContain("평균 별점");
    expect(html).toContain(">3.70 / 5<");
    expect(html).toContain("최근 30일 비중");
    expect(html).toContain(">67%<");
    expect(html).toContain("이전 분석 결과");
    expect(html).toContain("march_reviews.csv");
    expect(html).toContain("Priority 61.4");
    expect(html).toContain("href=\"/dashboard/analysis/analysis-1\"");
  });

  it("renders guest empty state without redirecting", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: null
      })
    );

    const html = await renderDashboardHomePage();

    expect(html).toContain("여기도 채워주세요");
    expect(html).toContain("로그인하면 지금까지 분석한 리뷰의 누적 통계와 이전 결과 목록을 홈에서 바로 볼 수 있습니다.");
  });

  it("renders load failure state when saved analyses cannot be fetched", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        error: { message: "db failure" }
      })
    );

    const html = await renderDashboardHomePage();

    expect(html).toContain("문제가 발생했어요");
    expect(html).toContain("저장된 분석을 불러오지 못했습니다.");
  });
});
