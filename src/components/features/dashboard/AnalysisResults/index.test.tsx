/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlanProvider } from "@/contexts/PlanContext";
import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import type { Capabilities } from "@/lib/capabilities";
import AnalysisResults from "./index";

vi.mock("next/link", () => ({
  default: (() => {
    type MockLinkProps = React.ComponentPropsWithoutRef<"a"> & { href: string };
    const LinkComponent = React.forwardRef<HTMLAnchorElement, MockLinkProps>(({ href, children, ...props }, ref) => (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    ));
    LinkComponent.displayName = "MockLink";
    return LinkComponent;
  })()
}));

const caps: Capabilities = {
  databaseConfigured: true,
  authConfigured: true,
  openaiConfigured: true,
  plan: "pro",
  planLabel: "Pro",
  monthlyLimit: 1000,
  monthlyUsed: 5,
  aiAdvancedAvailable: true
};

const result: DashboardAnalysisResult = {
  stats: {
    total: 12,
    positive: 7,
    negative: 2,
    neutral: 3,
    positiveRatio: 0.58,
    negativeRatio: 0.17,
    avgRating: 4.4,
    negativeKeywordsTop10: [{ keyword: "지연", count: 2 }],
    categoryCounts: {
      배송: 1,
      품질: 2,
      가격: 0,
      사용성: 0,
      CS: 0,
      기타: 0
    },
    priorityScore: 54.2,
    recentness: {
      hasDates: true,
      last30Share: 0.27,
      last90Share: 0.51,
      last30NegativeRatio: 0.09
    }
  },
  suggestions: {
    detailPageCopy: ["배송 상태 업데이트를 추가하세요."],
    csResponseTemplates: ["사과 메시지 템플릿을 준비하세요."],
    faqRecommendations: ["반품 기준을 먼저 안내하세요."],
    notes: ["주간 단위 모니터링 권장"]
  },
  urgentReviews: [
    {
      review: {
        text: "배송이 늦어요",
        rating: 1,
        reviewedAt: "2026-03-17",
        sentiment: "negative",
        category: "배송"
      },
      highlightedText: "배송이 늦어요",
      daysSinceWritten: 2
    }
  ],
  priorityMatrix: [
    {
      category: "배송",
      frequency: 4,
      frequencyPct: 33,
      impact: 9,
      quadrant: "critical",
      actionSummary: "배송 지연 공지를 보강하세요."
    }
  ],
  ratingSimulation: {
    currentAvg: 4.2,
    scenarios: [
      {
        label: "상위 3건 해결",
        newAvg: 4.4,
        delta: 0.2,
        resolvedCount: 3,
        relatedKeywords: ["배송"]
      }
    ]
  },
  positiveKeywords: [{ keyword: "친절", count: 3, sentiment: "positive" }],
  actionItems: [
    {
      id: "action-1",
      impact: "high",
      category: "detailPage",
      action: "배송 일정 안내를 상세페이지 상단에 고정하세요.",
      relatedKeyword: "배송",
      reviewCount: 4
    }
  ],
  classified: [],
  meta: {
    filename: "sample.csv",
    stored: true,
    analysisId: "analysis-1",
    truncated: false
  }
};

describe("AnalysisResults", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn()
    });
  });

  it("adds single-column layout hooks across the desktop result surface", () => {
    const { container, getByText } = render(
      <PlanProvider plan="pro">
        <AnalysisResults result={result} caps={caps} busy={false} onDownloadPdf={vi.fn()} />
      </PlanProvider>
    );

    expect(container.textContent).toContain("부정 비율");
    expect(container.textContent).toContain("액션 아이템");
    expect(getByText("상세페이지 반영")).toBeTruthy();
    expect(getByText("CS 응대 템플릿")).toBeTruthy();
    expect(container.querySelector('[data-tone="urgent"]')).toBeTruthy();
    expect(container.querySelector('[data-tone="simulation"]')).toBeTruthy();
  });

  it("shows a save failure notice when persistence failed", () => {
    const failedResult: DashboardAnalysisResult = {
      ...result,
      meta: {
        ...result.meta,
        stored: false,
        storageAttempted: true,
        storageError: "analyses_insert_admin_failed: insert failed"
      }
    };

    render(
      <PlanProvider plan="pro">
        <AnalysisResults result={failedResult} caps={caps} busy={false} onDownloadPdf={vi.fn()} />
      </PlanProvider>
    );

    expect(screen.getByText("저장 실패")).toBeTruthy();
    expect(screen.getByText("저장에 실패해 이번 결과는 히스토리에 남지 않았습니다.")).toBeTruthy();
  });

  it("shows a summary-only save notice when compat fallback stored the analysis", () => {
    const compatStoredResult: DashboardAnalysisResult = {
      ...result,
      meta: {
        ...result.meta,
        stored: true,
        storageAttempted: true,
        storageWarning: "기본 요약만 저장되었습니다. 확장 상세는 DB 업데이트 후 저장됩니다."
      }
    };

    render(
      <PlanProvider plan="pro">
        <AnalysisResults result={compatStoredResult} caps={caps} busy={false} onDownloadPdf={vi.fn()} />
      </PlanProvider>
    );

    expect(screen.getByText("요약 저장 완료")).toBeTruthy();
    expect(screen.getByText("기본 요약만 저장되었습니다. 확장 상세는 DB 업데이트 후 저장됩니다.")).toBeTruthy();
  });

  it("shows legacy guidance and unavailable-section messages for old saved reports", () => {
    render(
      <PlanProvider plan="pro">
        <AnalysisResults
          result={result}
          caps={caps}
          busy={false}
          onDownloadPdf={vi.fn()}
          resultContext={{
            source: "saved_legacy",
            legacyNotice: "이 저장본은 이전 형식으로 저장되어 일부 섹션은 추정값 또는 비어 있는 상태로 표시됩니다.",
            unavailableSections: ["simulation", "positiveKeywords"]
          }}
        />
      </PlanProvider>
    );

    expect(screen.getByText("이전 형식 저장본")).toBeTruthy();
    expect(screen.getByText("이 저장본은 이전 형식으로 저장되어 일부 섹션은 추정값 또는 비어 있는 상태로 표시됩니다.")).toBeTruthy();
    expect(screen.getAllByText("이 저장본에는 해당 데이터가 없습니다.").length).toBeGreaterThanOrEqual(2);
  });
});
