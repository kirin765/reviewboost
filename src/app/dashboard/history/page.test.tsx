import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { mockRedirect, mockCreateSupabaseServerComponentClient } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  mockCreateSupabaseServerComponentClient: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerComponentClient: mockCreateSupabaseServerComponentClient
}));

import HistoryPage from "./page";

type HistoryAnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: {
    total: number;
    negativeRatio?: number;
  } | null;
};

function createSupabaseMock({
  user,
  rows = [],
  error = null
}: {
  user: { id: string } | null;
  rows?: HistoryAnalysisRow[];
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

async function renderHistoryPage() {
  const element = await HistoryPage();
  return renderToStaticMarkup(element);
}

describe("/dashboard/history page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders report rows with saved-at, priority, ready badge, and detail links", async () => {
    const rows: HistoryAnalysisRow[] = [
      {
        id: "analysis-1",
        created_at: "2026-03-01T09:00:00.000Z",
        input_filename: "march_reviews.csv",
        priority_score: 72.36,
        stats: { total: 128, negativeRatio: 0.23 }
      },
      {
        id: "analysis-2",
        created_at: "2026-03-02T11:30:00.000Z",
        input_filename: null,
        priority_score: 15,
        stats: { total: 12, negativeRatio: 0.1 }
      }
    ];

    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        rows
      })
    );

    const html = await renderHistoryPage();

    expect(html).toContain("Report");
    expect(html).toContain("Saved at");
    expect(html).toContain("Priority");
    expect(html).toContain("Ready");
    expect(html).toContain("march_reviews.csv");
    expect(html).toContain(new Date(rows[0].created_at).toLocaleString("ko-KR"));
    expect(html).toContain("Priority 72.4");
    expect(html).toContain("href=\"/dashboard/analysis/analysis-1\"");
    expect(html).toContain(">CSV<");
    expect(html).not.toContain("href=\"/api/report/analysis-1\"");
  });

  it("renders empty state inside the history table card", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        rows: []
      })
    );

    const html = await renderHistoryPage();

    expect(html).toContain("Report list");
    expect(html).toContain("저장된 분석이 없습니다. 먼저 대시보드에서 CSV를 분석해보세요.");
  });

  it("renders storage-disabled fallback when supabase is unavailable", async () => {
    mockCreateSupabaseServerComponentClient.mockRejectedValue(new Error("supabase disabled"));

    const html = await renderHistoryPage();

    expect(html).toContain("지금은 저장 기능이 꺼져 있어, 여기에는 목록이 표시되지 않습니다.");
    expect(html).toContain("PDF 다운로드");
  });

  it("renders load failure state when query returns an error", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: "user-1" },
        error: { message: "db failure" }
      })
    );

    const html = await renderHistoryPage();

    expect(html).toContain("히스토리 로드 실패");
    expect(html).toContain("잠시 후 다시 시도해주세요.");
  });

  it("redirects unauthenticated users to login", async () => {
    mockCreateSupabaseServerComponentClient.mockResolvedValue(
      createSupabaseMock({
        user: null
      })
    );

    await expect(renderHistoryPage()).rejects.toThrow("NEXT_REDIRECT:/login?next=%2Fdashboard%2Fhistory");
    expect(mockRedirect).toHaveBeenCalledWith("/login?next=%2Fdashboard%2Fhistory");
  });
});
