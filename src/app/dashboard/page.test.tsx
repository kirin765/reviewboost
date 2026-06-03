import React from "react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockAuth, mockListAnalysesForUser } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockListAnalysesForUser: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth
}));

vi.mock("@/lib/db/queries", () => ({
  listAnalysesForUser: mockListAnalysesForUser
}));

import DashboardHomePage from "./page";

type AnalysisRow = {
  id: string;
  createdAt: string;
  inputFilename: string | null;
  priorityScore: string | number;
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

async function renderDashboardHomePage() {
  const element = await DashboardHomePage();
  return renderToStaticMarkup(element);
}

describe("/dashboard home page", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = "postgres://test";
  });

  afterAll(() => {
    delete process.env.DATABASE_URL;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user-1" });
  });

  it("renders aggregate metrics and previous analysis rows", async () => {
    const rows: AnalysisRow[] = [
      {
        id: "analysis-1",
        createdAt: "2026-03-30T09:00:00.000Z",
        inputFilename: "march_reviews.csv",
        priorityScore: 61.4,
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
        createdAt: "2026-03-29T09:00:00.000Z",
        inputFilename: "april_reviews.csv",
        priorityScore: 42.1,
        stats: {
          total: 50,
          negative: 10,
          negativeRatio: 0.2,
          avgRating: 4.1,
          recentness: { hasDates: true, last30Share: 0.4 }
        }
      }
    ];

    mockListAnalysesForUser.mockResolvedValue(rows);

    const html = await renderDashboardHomePage();

    expect(html).toContain("총 리뷰");
    expect(html).toContain("부정비율");
    expect(html).toContain("평균 별점");
    expect(html).toContain("최근 30일 비중");
    expect(html).toContain("이전 분석 결과");
    expect(html).toContain("march_reviews.csv");
    expect(html).toContain("href=\"/dashboard/analysis/analysis-1\"");
  });

  it("renders guest empty state without redirecting", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const html = await renderDashboardHomePage();

    expect(html).toContain("여기도 채워주세요");
    expect(html).toContain("로그인하면 지금까지 분석한 리뷰의 누적 통계와 이전 결과 목록을 홈에서 바로 볼 수 있습니다.");
    expect(mockListAnalysesForUser).not.toHaveBeenCalled();
  });

  it("renders load failure state when saved analyses cannot be fetched", async () => {
    mockListAnalysesForUser.mockRejectedValue(new Error("db failure"));

    const html = await renderDashboardHomePage();

    expect(html).toContain("문제가 발생했어요");
    expect(html).toContain("저장된 분석을 불러오지 못했습니다.");
  });
});
