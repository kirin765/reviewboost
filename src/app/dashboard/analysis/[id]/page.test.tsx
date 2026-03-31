import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockCreateSupabaseServerComponentClient, mockGetNavigationSessionState } = vi.hoisted(() => ({
  mockCreateSupabaseServerComponentClient: vi.fn(),
  mockGetNavigationSessionState: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerComponentClient: mockCreateSupabaseServerComponentClient
}));

vi.mock("@/lib/navigation_session", () => ({
  getNavigationSessionState: mockGetNavigationSessionState
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }
}));

vi.mock("@/components/features/dashboard/AnalysisResults", () => ({
  default: ({
    result,
    headerDescription
  }: {
    result: { meta: { filename: string | null } };
    headerDescription?: string;
  }) => (
    <div>
      <span>mock-analysis-results</span>
      <span>{result.meta.filename}</span>
      <span>{headerDescription}</span>
    </div>
  )
}));

import AnalysisDetailPage from "./page";

function createSupabaseMock({
  user = { id: "user-1" },
  analysisRow,
  reviews = []
}: {
  user?: { id: string } | null;
  analysisRow?: Record<string, unknown> | null;
  reviews?: Record<string, unknown>[];
}) {
  const analysisQuery = {
    eq: vi.fn(),
    single: vi.fn()
  };
  analysisQuery.eq.mockReturnValue(analysisQuery);
  analysisQuery.single.mockResolvedValue({ data: analysisRow, error: analysisRow ? null : { message: "missing" } });

  const reviewsQuery = {
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn()
  };
  reviewsQuery.eq.mockReturnValue(reviewsQuery);
  reviewsQuery.order.mockReturnValue(reviewsQuery);
  reviewsQuery.limit.mockResolvedValue({ data: reviews, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } })
    },
    from: vi.fn((table: string) => {
      if (table === "analyses") {
        return {
          select: vi.fn().mockReturnValue(analysisQuery)
        };
      }

      return {
        select: vi.fn().mockReturnValue(reviewsQuery)
      };
    })
  };
}

describe("/dashboard/analysis/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNavigationSessionState.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
      userEmail: "tester@example.com",
      plan: "pro"
    });
  });

  it("uses the shared analysis result surface when a stored payload exists", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        analysisRow: {
          id: "analysis-1",
          created_at: "2026-03-31T00:00:00.000Z",
          input_filename: "stored.csv",
          priority_score: 57.4,
          stats: {
            total: 10,
            negative: 3,
            negativeRatio: 0.3,
            avgRating: 3.9,
            positive: 3,
            neutral: 4,
            positiveRatio: 0.3,
            negativeKeywordsTop10: [],
            categoryCounts: { 배송: 1, 품질: 2, 가격: 0, 사용성: 0, CS: 0, 기타: 0 },
            priorityScore: 57.4,
            recentness: { hasDates: true, last30Share: 0.5, last90Share: 0.8, last30NegativeRatio: 0.2 }
          },
          suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
          result_payload: {
            stats: {
              total: 10,
              negative: 3,
              negativeRatio: 0.3,
              avgRating: 3.9,
              positive: 3,
              neutral: 4,
              positiveRatio: 0.3,
              negativeKeywordsTop10: [],
              categoryCounts: { 배송: 1, 품질: 2, 가격: 0, 사용성: 0, CS: 0, 기타: 0 },
              priorityScore: 57.4,
              recentness: { hasDates: true, last30Share: 0.5, last90Share: 0.8, last30NegativeRatio: 0.2 }
            },
            suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
            classified: [],
            urgentReviews: [],
            priorityMatrix: [],
            ratingSimulation: { currentAvg: 3.9, scenarios: [] },
            positiveKeywords: [],
            actionItems: []
          }
        }
      })
    );

    const html = renderToStaticMarkup(
      await AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-1" })
      })
    );

    expect(html).toContain("mock-analysis-results");
    expect(html).toContain("stored.csv");
    expect(html).toContain("우선순위 57.4");
  });

  it("renders the legacy fallback when only stats and suggestions were stored", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        analysisRow: {
          id: "analysis-legacy",
          created_at: "2026-03-31T00:00:00.000Z",
          input_filename: "legacy.csv",
          priority_score: 44.1,
          stats: {
            total: 8,
            negative: 2,
            negativeRatio: 0.25,
            avgRating: 4.2,
            positive: 4,
            neutral: 2,
            positiveRatio: 0.5,
            negativeKeywordsTop10: [{ keyword: "배송", count: 2 }],
            categoryCounts: { 배송: 2, 품질: 1, 가격: 0, 사용성: 0, CS: 0, 기타: 0 },
            priorityScore: 44.1,
            recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null }
          },
          suggestions: {
            detailPageCopy: ["배송 일정을 상세페이지 상단에 안내하세요."],
            csResponseTemplates: ["배송 지연 사과 템플릿"],
            faqRecommendations: ["배송 소요일 FAQ 추가"],
            notes: ["이 저장본은 이전 버전 결과입니다."]
          },
          result_payload: null
        },
        reviews: [
          {
            id: "review-1",
            reviewed_at: "2026-03-30T00:00:00.000Z",
            rating: 1,
            text: "배송이 늦었어요",
            sentiment: "negative",
            category: "배송"
          }
        ]
      })
    );

    const html = renderToStaticMarkup(
      await AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-legacy" })
      })
    );

    expect(html).toContain("일부 고급 섹션이 축약 표시됩니다");
    expect(html).toContain("배송이 늦었어요");
    expect(html).toContain("CS 응대 템플릿");
    expect(html).toContain("배송 지연 사과 템플릿");
    expect(html).toContain("data-tone=\"legacy-note\"");
    expect(html).toContain("활용 제안");
  });

  it("redirects unauthenticated users to login", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: null
      })
    );

    await expect(
      AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-redirect" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=%2Fdashboard%2Fanalysis%2Fanalysis-redirect");
  });
});
