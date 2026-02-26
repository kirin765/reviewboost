import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  renderReportHtml: vi.fn(),
  launch: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/report_html", () => ({
  renderReportHtml: mocks.renderReportHtml
}));

vi.mock("puppeteer", () => ({
  default: {
    launch: mocks.launch
  }
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

describe("POST /api/report", () => {
  it("success: returns pdf response on normal render path", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    const page = { setContent: vi.fn().mockResolvedValue(undefined), pdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) };
    const close = vi.fn().mockResolvedValue(undefined);
    const browser = { newPage: vi.fn().mockResolvedValue(page), close };
    mocks.launch.mockResolvedValue(browser as never);

    const req = new Request("https://reviewboost.app/api/report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://reviewboost.app"
      },
      body: JSON.stringify({
        stats: { total: 1, positive: 1, negative: 0, neutral: 0, positiveRatio: 1, negativeRatio: 0, avgRating: 4, negativeKeywordsTop10: [], categoryCounts: {}, priorityScore: 1, recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null } },
        suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
        meta: { filename: "r.csv" }
      })
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer");
  });

  it("fallback: returns render-failed response when puppeteer errors", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.launch.mockRejectedValue(new Error("no browser"));

    const req = new Request("https://reviewboost.app/api/report", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://reviewboost.app"
      },
      body: JSON.stringify({
        stats: { total: 1, positive: 1, negative: 0, neutral: 0, positiveRatio: 1, negativeRatio: 0, avgRating: 4, negativeKeywordsTop10: [], categoryCounts: {}, priorityScore: 1, recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null } },
        suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] }
      })
    });

    const res = await POST(req);

    expect(res.status).toBe(501);
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer-failed");
  });
});
