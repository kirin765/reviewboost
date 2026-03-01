import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  renderReportHtml: vi.fn(),
  logApiError: vi.fn(),
  renderReportPdf: vi.fn()
}));

vi.mock("@/lib/report_html", () => ({
  renderReportHtml: mocks.renderReportHtml
}));

vi.mock("@/lib/report_renderer", () => ({
  renderReportPdf: mocks.renderReportPdf
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

describe("POST /api/report", () => {
  it("success: returns pdf response on normal render path", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.renderReportPdf.mockResolvedValue({ ok: true, renderer: "puppeteer", buffer: Buffer.from([1, 2, 3]), allErrors: [] });

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

  it("success: returns pdf response when puppeteer fails but PDFKit succeeds", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.renderReportPdf.mockResolvedValue({
      ok: true,
      renderer: "pdfkit-fallback",
      buffer: Buffer.from([1, 2, 3]),
      allErrors: ["Puppeteer 실패: no browser"]
    });

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

    expect(res.status).toBe(200);
    expect(res.headers.get("x-report-renderer")).toBe("pdfkit-fallback");
  });

  it("fails fast when REPORT_REQUIRE_PUPPETEER_STYLE=1 and Puppeteer fails", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: ["Puppeteer 실패: no browser"],
      puppeteerError: "Puppeteer 실패 [puppeteer_launch_error]: no browser",
      fallbackError: "PDFKit 폴백 비활성화(REPORT_REQUIRE_PUPPETEER_STYLE=1)"
    });

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
    expect(res.headers.get("x-report-fallback-error")).toContain("REPORT_REQUIRE_PUPPETEER_STYLE=1");
  });

  it("fallback: returns render-failed response when both renderers fail", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: ["Puppeteer 실패: no browser", "PDFKit 실패: font missing"],
      puppeteerError: "Puppeteer 실패: no browser",
      fallbackError: "PDFKit : font missing"
    });

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
    expect(res.headers.get("x-report-fallback-error")).toBe("PDFKit : font missing");
  });

  it("fallback: returns 501 when PDFKit fallback fails due to missing Korean font", async () => {
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: [
        "Puppeteer 실패: no browser",
        "PDFKit 실패: PDFKit font missing"
      ],
      puppeteerError: "Puppeteer 실패: no browser",
      fallbackError: "PDFKit font missing"
    });

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
    expect(res.headers.get("x-report-fallback-error")).toBe("PDFKit font missing");
  });
});
