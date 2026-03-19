/** @vitest-environment jsdom */

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AnalysisKpiGrid from "./AnalysisKpiGrid";

const stats = {
  total: 12,
  positive: 7,
  negative: 2,
  neutral: 3,
  positiveRatio: 0.58,
  negativeRatio: 0.17,
  avgRating: 4.4,
  negativeKeywordsTop10: [],
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
};

describe("AnalysisKpiGrid", () => {
  it("uses the single-column desktop layout hook", () => {
    const { container } = render(<AnalysisKpiGrid stats={stats} includeRecentness />);

    expect(container.querySelector(".kpiRowSingleColumn")).toBeTruthy();
    expect(container.querySelectorAll(".kpiCard")).toHaveLength(5);
  });
});
