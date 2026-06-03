import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  authFn: vi.fn(),
  getAnalysisForUser: vi.fn(),
  renderReportHtml: vi.fn(),
  logApiError: vi.fn(),
  renderReportPdf: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authFn
}));

vi.mock("@/lib/db/queries", () => ({
  getAnalysisForUser: mocks.getAnalysisForUser
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

function analysisRow() {
  return {
    id: "analysis-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    inputFilename: "r.csv",
    stats: {
      total: 1,
      positive: 1,
      negative: 0,
      neutral: 0,
      positiveRatio: 1,
      negativeRatio: 0,
      avgRating: 4,
      negativeKeywordsTop10: [],
      categoryCounts: {},
      priorityScore: 1,
      recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null }
    },
    suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] }
  };
}

function makeRequest() {
  return new Request("https://reviewboost.app/api/report/analysis-1", {
    method: "GET",
    headers: { origin: "https://reviewboost.app" }
  });
}

describe("GET /api/report/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authFn.mockResolvedValue({ userId: "user-1" });
    mocks.getAnalysisForUser.mockResolvedValue(analysisRow());
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");
  });

  it("성공: 저장된 분석 데이터를 PDF로 변환한다", async () => {
    mocks.renderReportPdf.mockResolvedValue({
      ok: true,
      renderer: "puppeteer",
      buffer: Buffer.from([1, 2, 3]),
      allErrors: []
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer");
  });

  it("성공: Puppeteer 실패 후 PDFKit 폴백으로 PDF를 반환한다", async () => {
    mocks.renderReportPdf.mockResolvedValue({
      ok: true,
      renderer: "pdfkit-fallback",
      buffer: Buffer.from([1, 2, 3]),
      allErrors: ["Puppeteer 실패: no browser"],
      fallbackReason: "puppeteer-failed"
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("x-report-renderer")).toBe("pdfkit-fallback");
    expect(res.headers.get("x-puppeteer-error")).toBe("Puppeteer : no browser");
    expect(res.headers.get("x-report-fallback-error")).toBe("puppeteer-failed");
  });

  it("폴백 차단 모드에서는 501로 즉시 반환한다", async () => {
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: ["Puppeteer 실패: no browser"],
      puppeteerError: "Puppeteer 실패 [puppeteer_launch_error]: no browser",
      fallbackError: "PDFKit 폴백 비활성화(REPORT_REQUIRE_PUPPETEER_STYLE=1)"
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(501);
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer-failed");
    expect(res.headers.get("x-report-fallback-error")).toContain("REPORT_REQUIRE_PUPPETEER_STYLE=1");
  });

  it("조회 실패 시 폴백도 실패하면 501 반환", async () => {
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: ["Puppeteer 실패: no browser", "PDFKit 실패: font missing"],
      puppeteerError: "Puppeteer 실패: no browser",
      fallbackError: "PDFKit : font missing"
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(501);
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer-failed");
    expect(res.headers.get("x-report-fallback-error")).toBe("PDFKit : font missing");
  });

  it("폰트 누락으로 폴백 실패 시 501 반환", async () => {
    mocks.renderReportPdf.mockResolvedValue({
      ok: false,
      allErrors: ["Puppeteer 실패: no browser", "PDFKit 실패: PDFKit font missing"],
      puppeteerError: "Puppeteer 실패: no browser",
      fallbackError: "PDFKit font missing"
    });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(501);
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer-failed");
    expect(res.headers.get("x-report-fallback-error")).toBe("PDFKit font missing");
  });

  it("로그인되지 않은 사용자는 로그인으로 redirect", async () => {
    mocks.authFn.mockResolvedValue({ userId: null });

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("조회 실패 시 404 반환", async () => {
    mocks.getAnalysisForUser.mockResolvedValue(null);

    const res = await GET(makeRequest(), { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).toBe("분석을 찾을 수 없습니다.");
  });
});
