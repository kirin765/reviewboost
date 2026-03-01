import { describe, expect, it, vi } from "vitest";
import { renderReportPdf } from "./report_renderer";

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
  renderReportPdfBuffer: vi.fn()
}));

vi.mock("puppeteer", () => ({
  default: {
    launch: mocks.launch
  }
}));

vi.mock("@/lib/report_pdfkit", () => ({
  renderReportPdfBuffer: mocks.renderReportPdfBuffer
}));

const sampleInput = {
  html: "<html><body>ok</body></html>",
  title: "ReviewBoost 요약 리포트",
  stats: {
    total: 1,
    positive: 1,
    negative: 0,
    neutral: 0,
    positiveRatio: 1,
    negativeRatio: 0,
    avgRating: 4.2,
    negativeKeywordsTop10: [],
    categoryCounts: {},
    priorityScore: 1,
    recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null }
  },
  suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
  meta: { filename: "review.csv", createdAt: "2026-01-01T00:00:00.000Z" }
};

describe("report_renderer", () => {
  it("PDFKit fallback calls with requireKoreanFont=true", async () => {
    mocks.launch.mockRejectedValueOnce(new Error("puppeteer failed"));
    mocks.renderReportPdfBuffer.mockResolvedValueOnce(Buffer.from([1, 2, 3]));

    const result = await renderReportPdf(sampleInput);

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ renderer: "pdfkit-fallback" });
    expect(mocks.renderReportPdfBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        title: sampleInput.title,
        stats: sampleInput.stats,
        suggestions: sampleInput.suggestions,
        meta: sampleInput.meta,
        requireKoreanFont: true
      })
    );
  });

  it("returns failure with fallback error when PDFKit reports Korean font missing", async () => {
    mocks.launch.mockRejectedValueOnce(new Error("puppeteer failed"));
    mocks.renderReportPdfBuffer.mockRejectedValueOnce(new Error("PDFKit 한글 폰트 미설치"));

    const result = await renderReportPdf(sampleInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fallbackError).toMatch(/한글 폰트 미설치/);
      expect(result.puppeteerError).toMatch(/puppeteer failed/);
      expect(result.allErrors).toHaveLength(2);
    }
  });
});
