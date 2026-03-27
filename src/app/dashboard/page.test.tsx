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
  sampleRows: [
    { content: "빠르고 좋아요", rating: "5", date: "2026-02-22" }
  ],
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

vi.mock("@/components/Dashboard/DashboardTabs", () => ({
  default: ({
    activeTab,
    onChange
  }: {
    activeTab: "analysis" | "results";
    onChange: (next: "analysis" | "results") => void;
  }) => (
    <div role="tablist" aria-label="분석 단계 탭">
      <button type="button" role="tab" aria-selected={activeTab === "analysis"} onClick={() => onChange("analysis")}>
        분석하기
      </button>
      <button type="button" role="tab" aria-selected={activeTab === "results"} onClick={() => onChange("results")}>
        결과 보기
      </button>
    </div>
  )
}));

vi.mock("@/components/features/dashboard/AnalysisPanel", () => ({
  default: ({
    file,
    busy,
    preview,
    onFileSelect,
    onAnalyze
  }: {
    file: File | null;
    busy: boolean;
    preview: CsvPreviewType | null;
    onFileSelect: (file: File | null) => void;
    onAnalyze: () => void;
  }) => (
    <section aria-label="분석 패널">
      <label htmlFor="test-csv-file">CSV 파일 업로드</label>
      <input
        id="test-csv-file"
        type="file"
        disabled={busy}
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
      />
      <button type="button" disabled={!file || busy} onClick={onAnalyze}>
        {preview ? "분석 시작" : "다음: 미리보기"}
      </button>
    </section>
  )
}));

vi.mock("@/components/features/dashboard/AnalysisResults", () => ({
  default: () => <div>분석 결과 표시</div>
}));

import DashboardPage from "./page";

function jsonResponse<T>(payload: T, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function buildMockedFetch() {
  const mockedFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/capabilities") {
      return jsonResponse(capabilities);
    }

    if (url === "/api/preview" && init?.method === "POST") {
      return jsonResponse(previewData);
    }

    if (url === "/api/analyze" && init?.method === "POST") {
      return jsonResponse(analyzeResult, 200);
    }

    return new Response("not found", { status: 404 });
  });

  vi.stubGlobal("fetch", mockedFetch);
  return mockedFetch;
}

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

describe("DashboardPage 분석 파이프라인", () => {
  beforeEach(() => {
    buildMockedFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("파일 업로드 후 미리보기 -> 분석까지 상태가 전환된다", async () => {
    render(<DashboardPage />);

    expect(screen.queryByText("리뷰 CSV를 업로드하고 개선 액션까지 바로 확인하세요.")).toBeNull();
    expect(screen.queryByText("현재 워크스페이스 안내")).toBeNull();

    const file = new File(["content,rating,date\n좋아요,5,2026-02-22"], "sample.csv", {
      type: "text/csv"
    });

    const fileInput = screen.getByLabelText("CSV 파일 업로드");
    fireEvent.change(fileInput, { target: { files: [file] } });

    const previewButton = screen.getByRole("button", { name: "다음: 미리보기" });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "분석 시작" })).toBeTruthy();
      expect((global.fetch as unknown as { mock: { calls: FetchCall[] } }).mock.calls.some(([url]) => String(url).includes("/api/preview"))).toBe(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "분석 시작" }));

    expect(await screen.findByText("분석 결과 표시")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "결과 보기" }).getAttribute("aria-selected")).toBe("true");
    expect((global.fetch as unknown as { mock: { calls: FetchCall[] } }).mock.calls.some(([url]) => String(url).includes("/api/analyze"))).toBe(true);
  });
});
