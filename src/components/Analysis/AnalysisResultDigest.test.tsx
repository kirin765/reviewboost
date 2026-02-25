/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnalysisResultDigest from "./AnalysisResultDigest";

const mockResult = {
  stats: {
    total: 5,
    positive: 3,
    negative: 1,
    neutral: 1,
    positiveRatio: 0.6,
    negativeRatio: 0.2,
    avgRating: 4.2,
    negativeKeywordsTop10: [{ keyword: "지연", count: 2 }],
    categoryCounts: {
      배송: 1,
      품질: 0,
      가격: 0,
      사용성: 0,
      CS: 0,
      기타: 0
    },
    priorityScore: 53,
    recentness: {
      hasDates: true,
      last30Share: 0.3,
      last90Share: 0.5,
      last30NegativeRatio: 0.1
    }
  },
  suggestions: {
    detailPageCopy: ["배송 상태 업데이트를 추가하세요."],
    csResponseTemplates: ["사과 메시지 템플릿을 준비하세요."],
    faqRecommendations: ["반품 기준을 먼저 안내하세요."],
    notes: ["주간 단위 모니터링 권장"]
  }
};

describe("AnalysisResultDigest", () => {
  it("renders digest cards and list sections", () => {
    render(<AnalysisResultDigest result={mockResult} />);

    expect(screen.getByRole("heading", { level: 2, name: "부정 키워드 TOP10" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "문제 카테고리" })).toBeTruthy();
    expect(screen.getByText("지연")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "개선 제안: 상세페이지 문구" })).toBeTruthy();
  });
});
