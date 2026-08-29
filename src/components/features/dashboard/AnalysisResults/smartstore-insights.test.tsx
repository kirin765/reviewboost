/** @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SmartstoreInsightsSection from "./smartstore-insights";
import type { SmartstoreInsights } from "@/lib/types";

afterEach(cleanup);

const insights: SmartstoreInsights = {
  productStats: [
    {
      productName: "강아지 배변패드 100매",
      reviewCount: 2,
      avgRating: 1,
      negativeRatio: 1,
      photoShare: 0.5
    }
  ],
  photoReviewCount: 1,
  photoReviewRatio: 0.5,
  bestReviewCount: 1,
  totalHelpful: 10,
  topHelpfulReviews: [{ text: "배송이 늦었어요", rating: 1, productName: "강아지 배변패드 100매", helpfulCount: 7 }],
  unrepliedNegativeCount: 1,
  unrepliedNegative: [
    {
      review: {
        text: "배송이 너무 늦었어요",
        rating: 1,
        reviewedAt: null,
        sentiment: "negative",
        category: "배송",
        productName: "강아지 배변패드 100매",
        replyYn: "N"
      },
      productName: "강아지 배변패드 100매"
    }
  ],
  negativeWithPhotoCount: 0,
  negativeWithPhoto: []
};

describe("SmartstoreInsightsSection", () => {
  it("renders 검수(문제 리뷰) + 리서치(상품 분포) 요약", () => {
    render(<SmartstoreInsightsSection insights={insights} />);

    expect(screen.getByText(/스마트스토어 검수 · 리서치/)).toBeTruthy();
    expect(screen.getByText(/답글 없는 부정 리뷰/)).toBeTruthy();
    expect(screen.getByText("1건")).toBeTruthy();
    expect(screen.getByText("배송이 너무 늦었어요")).toBeTruthy();
    // 리서치: 상품별 분포 표
    expect(screen.getByText(/상품별 리뷰 분포/)).toBeTruthy();
    expect(screen.getAllByText("강아지 배변패드 100매").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1.0")).toBeTruthy(); // 평균 별점 셀
  });

  it("renders empty state for 해소된 검수 항목", () => {
    render(
      <SmartstoreInsightsSection
        insights={{ ...insights, unrepliedNegativeCount: 0, unrepliedNegative: [], negativeWithPhoto: [] }}
      />
    );

    expect(screen.getByText(/답글 없는 부정 리뷰가 없습니다\./)).toBeTruthy();
  });
});