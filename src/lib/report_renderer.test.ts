import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderReportPdf } from "./report_renderer";
import fs from "node:fs";

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

const baseEnv = { ...process.env };

function makeBrowser() {
  return {
    newPage: vi.fn().mockResolvedValue({
      setContent: vi.fn().mockResolvedValue(undefined),
      pdf: vi.fn().mockResolvedValue(Buffer.from([9, 8, 7]))
    }),
    close: vi.fn().mockResolvedValue(undefined)
  };
}

describe("report_renderer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...baseEnv };
    mocks.launch.mockReset();
    mocks.renderReportPdfBuffer.mockReset();
    process.env.REPORT_ENABLE_PDFKIT_FALLBACK = "1";
    process.env.REPORT_REQUIRE_PUPPETEER_STYLE = "0";
    process.env.PUPPETEER_MAX_RETRIES = "2";
    process.env.PUPPETEER_LAUNCH_TIMEOUT_MS = "120000";
    delete process.env.PUPPETEER_EXECUTABLE_PATH;
  });

  it("uses PDFKit fallback with requireKoreanFont=true when Puppeteer fails", async () => {
    process.env.PUPPETEER_MAX_RETRIES = "0";
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

  it("retries Puppeteer launch before falling back to PDFKit", async () => {
    process.env.PUPPETEER_MAX_RETRIES = "1";
    process.env.PUPPETEER_LAUNCH_TIMEOUT_MS = "3333";
    process.env.PUPPETEER_EXECUTABLE_PATH = "/opt/chrome/chrome";
    const browser = makeBrowser();

    mocks.launch.mockRejectedValueOnce(new Error("launch failed"));
    mocks.launch.mockResolvedValueOnce(browser);

    const result = await renderReportPdf(sampleInput);

    expect(result).toMatchObject({ ok: true, renderer: "puppeteer" });
    expect(mocks.launch).toHaveBeenCalledTimes(2);
    expect(mocks.launch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"]),
        timeout: 3333,
        executablePath: "/opt/chrome/chrome"
      })
    );
    expect(mocks.renderReportPdfBuffer).not.toHaveBeenCalled();
  });

  it("uses a discovered system Chromium path when no executable path env is provided", async () => {
    process.env.PUPPETEER_MAX_RETRIES = "0";
    delete process.env.PUPPETEER_EXECUTABLE_PATH;

    const existsSpy = vi.spyOn(fs, "existsSync").mockImplementation((target) => target === "/usr/bin/chromium");
    const browser = makeBrowser();
    mocks.launch.mockResolvedValueOnce(browser);

    const result = await renderReportPdf(sampleInput);

    expect(result).toMatchObject({ ok: true, renderer: "puppeteer" });
    expect(mocks.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"]),
        timeout: 120000,
        executablePath: "/usr/bin/chromium"
      })
    );
    existsSpy.mockRestore();
  });

  it("adds launch troubleshooting hint when Puppeteer fails to launch", async () => {
    process.env.PUPPETEER_MAX_RETRIES = "0";
    mocks.launch.mockRejectedValueOnce(new Error("puppeteer failed"));

    const result = await renderReportPdf(sampleInput);

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.puppeteerError).toContain("npx puppeteer browsers install chrome");
    }
  });

  it("blocks PDFKit fallback in REQUIRE_PUPPETEER_STYLE mode", async () => {
    process.env.REPORT_REQUIRE_PUPPETEER_STYLE = "1";
    process.env.PUPPETEER_MAX_RETRIES = "0";
    mocks.launch.mockRejectedValueOnce(new Error("puppeteer failed"));

    const result = await renderReportPdf(sampleInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fallbackError).toContain("REPORT_REQUIRE_PUPPETEER_STYLE=1");
      expect(result.puppeteerError).toMatch(/\[puppeteer_launch_error\]/);
    }
    expect(mocks.renderReportPdfBuffer).not.toHaveBeenCalled();
    expect(mocks.launch).toHaveBeenCalledTimes(1);
  });

  it("returns failure with fallback error when PDFKit reports Korean font missing", async () => {
    process.env.PUPPETEER_MAX_RETRIES = "0";
    mocks.launch.mockRejectedValueOnce(new Error("puppeteer failed"));
    mocks.renderReportPdfBuffer.mockRejectedValueOnce(new Error("PDFKit 한글 폰트 미설치"));

    const result = await renderReportPdf(sampleInput);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fallbackError).toMatch(/한글 폰트 미설치/);
      expect(result.puppeteerError).toMatch(/\[puppeteer_launch_error\]/);
      expect(result.allErrors).toHaveLength(2);
    }
  });
});
