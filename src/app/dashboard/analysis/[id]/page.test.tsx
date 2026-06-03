import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockAuth, mockGetAnalysisDetailForUser, mockGetReviewsForAnalysis, mockGetNavigationSessionState } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetAnalysisDetailForUser: vi.fn(),
  mockGetReviewsForAnalysis: vi.fn(),
  mockGetNavigationSessionState: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth
}));

vi.mock("@/lib/db/queries", () => ({
  getAnalysisDetailForUser: mockGetAnalysisDetailForUser,
  getReviewsForAnalysis: mockGetReviewsForAnalysis
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
    headerDescription,
    resultContext
  }: {
    result: { meta: { filename: string | null } };
    headerDescription?: string;
    resultContext?: { source: string; legacyNotice?: string };
  }) => (
    <div>
      <span>mock-analysis-results</span>
      <span>{result.meta.filename}</span>
      <span>{headerDescription}</span>
      <span>{resultContext?.source ?? "live"}</span>
      <span>{resultContext?.legacyNotice ?? ""}</span>
    </div>
  )
}));

import AnalysisDetailPage from "./page";

const baseStats = {
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
};

describe("/dashboard/analysis/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user-1" });
    mockGetReviewsForAnalysis.mockResolvedValue([]);
    mockGetNavigationSessionState.mockResolvedValue({
      authenticated: true,
      userId: "user-1",
      userEmail: "tester@example.com",
      plan: "pro"
    });
  });

  it("uses the shared analysis result surface when a stored payload exists", async () => {
    mockGetAnalysisDetailForUser.mockResolvedValue({
      id: "analysis-1",
      createdAt: new Date("2026-03-31T00:00:00.000Z"),
      inputFilename: "stored.csv",
      priorityScore: "57.4",
      stats: baseStats,
      suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
      resultPayload: {
        stats: baseStats,
        suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
        classified: [],
        urgentReviews: [],
        priorityMatrix: [],
        ratingSimulation: { currentAvg: 3.9, scenarios: [] },
        positiveKeywords: [],
        actionItems: []
      }
    });

    const html = renderToStaticMarkup(
      await AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-1" })
      })
    );

    expect(html).toContain("mock-analysis-results");
    expect(html).toContain("stored.csv");
    expect(html).toContain("우선순위 57.4");
  });

  it("uses the shared result surface for legacy saved analyses too", async () => {
    mockGetAnalysisDetailForUser.mockResolvedValue({
      id: "analysis-legacy",
      createdAt: new Date("2026-03-31T00:00:00.000Z"),
      inputFilename: "legacy.csv",
      priorityScore: "44.1",
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
      resultPayload: null
    });
    mockGetReviewsForAnalysis.mockResolvedValue([
      {
        id: "review-1",
        reviewedAt: new Date("2026-03-30T00:00:00.000Z"),
        rating: 1,
        text: "배송이 늦었어요",
        sentiment: "negative",
        category: "배송"
      }
    ]);

    const html = renderToStaticMarkup(
      await AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-legacy" })
      })
    );

    expect(html).toContain("mock-analysis-results");
    expect(html).toContain("legacy.csv");
    expect(html).toContain("saved_legacy");
    expect(html).toContain("이 저장본은 이전 형식으로 저장되어 일부 섹션은 추정값 또는 비어 있는 상태로 표시됩니다.");
  });

  it("shows the error state when the analysis is missing or not owned", async () => {
    mockGetAnalysisDetailForUser.mockResolvedValue(null);

    const html = renderToStaticMarkup(
      await AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-missing" })
      })
    );

    expect(html).toContain("문제가 발생했어요");
    expect(html).toContain("분석을 찾을 수 없거나 접근 권한이 없습니다.");
  });

  it("redirects unauthenticated users to login", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    await expect(
      AnalysisDetailPage({
        params: Promise.resolve({ id: "analysis-redirect" })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/login?next=%2Fdashboard%2Fanalysis%2Fanalysis-redirect");
  });
});
