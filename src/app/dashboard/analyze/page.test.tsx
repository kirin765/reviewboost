/** @vitest-environment jsdom */

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";
import type { DashboardAnalysisResult } from "@/lib/api/analysis";

const previewData = {
  columns: ["content", "rating", "date"],
  headerMode: "header" as const,
  inferred: {
    headerMode: "header" as const,
    textCol: "content",
    textColSource: "explicit" as const,
    ratingCol: "rating",
    dateCol: "date"
  },
  sampleRows: [{ content: "빠르고 좋아요", rating: "5", date: "2026-02-22" }],
  totalRows: 1,
  warnings: []
};

const analyzeResult: DashboardAnalysisResult = {
  stats: {
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
  },
  suggestions: {
    detailPageCopy: [],
    csResponseTemplates: [],
    faqRecommendations: [],
    notes: []
  },
  urgentReviews: [],
  priorityMatrix: [],
  ratingSimulation: { currentAvg: 4.7, scenarios: [] },
  actionItems: [],
  classified: [],
  meta: {
    filename: "sample.csv",
    stored: false,
    storageAttempted: true
  }
};

const capabilities = {
  supabaseConfigured: false,
  openaiConfigured: true,
  plan: "free",
  planLabel: "Free",
  monthlyLimit: 50,
  monthlyUsed: 1,
  aiAdvancedAvailable: false
};

vi.mock("@/components/features/dashboard/AnalysisPanel", () => ({
  default: ({
    file,
    preview,
    result,
    onFileSelect,
    onAnalyze
  }: {
    file: File | null;
    preview: CsvPreviewType | null;
    result: DashboardAnalysisResult | null;
    onFileSelect: (file: File | null) => void;
    onAnalyze: () => void;
  }) => (
    <section aria-label="분석 패널">
      <label htmlFor="test-csv-file">CSV 파일 업로드</label>
      <input id="test-csv-file" type="file" onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)} />
      {!result ? (
        <button type="button" disabled={!file} onClick={onAnalyze}>
          {preview ? "분석 시작" : "다음: 미리보기"}
        </button>
      ) : (
        <div>분석 결과 표시</div>
      )}
    </section>
  )
}));

import DashboardAnalyzePage from "./page";

function jsonResponse<T>(payload: T, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function buildMockedFetch() {
  const mockedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/capabilities") return jsonResponse(capabilities);
    if (url === "/api/preview" && init?.method === "POST") return jsonResponse(previewData);
    if (url === "/api/analyze" && init?.method === "POST") return jsonResponse(analyzeResult);
    return new Response("not found", { status: 404 });
  });

  vi.stubGlobal("fetch", mockedFetch);
  return mockedFetch;
}

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

describe("/dashboard/analyze page", () => {
  beforeEach(() => {
    buildMockedFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("moves from preview to result in the dedicated analyze route", async () => {
    render(<DashboardAnalyzePage />);

    const file = new File(["content,rating,date\n좋아요,5,2026-02-22"], "sample.csv", {
      type: "text/csv"
    });

    fireEvent.change(screen.getByLabelText("CSV 파일 업로드"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "다음: 미리보기" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "분석 시작" })).toBeTruthy();
      expect((global.fetch as unknown as { mock: { calls: FetchCall[] } }).mock.calls.some(([url]) => String(url).includes("/api/preview"))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));

    await waitFor(() => {
      expect(screen.getByText("분석 결과 표시")).toBeTruthy();
      expect((global.fetch as unknown as { mock: { calls: FetchCall[] } }).mock.calls.some(([url]) => String(url).includes("/api/analyze"))).toBe(true);
    });
  });
});
