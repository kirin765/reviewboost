import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  createSupabaseServerActionClient: vi.fn(),
  renderReportHtml: vi.fn(),
  launch: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: mocks.createSupabaseServerActionClient
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

function makeDbClient({ data }: { data: any }) {
  const eq2 = vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data, error: null }) });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } } }) },
    from: vi.fn().mockReturnValue({ select })
  };
}

describe("GET /api/report/[id]", () => {
  it("성공: 저장된 분석 데이터를 PDF로 변환한다", async () => {
    const dbClient = makeDbClient({
      data: {
        id: "analysis-1",
        created_at: "2026-01-01T00:00:00.000Z",
        input_filename: "r.csv",
        stats: { total: 1, positive: 1, negative: 0, neutral: 0, positiveRatio: 1, negativeRatio: 0, avgRating: 4, negativeKeywordsTop10: [], categoryCounts: {}, priorityScore: 1, recentness: { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null } },
        suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] }
      }
    });
    mocks.createSupabaseServerActionClient.mockReturnValue(dbClient);
    mocks.renderReportHtml.mockReturnValue("<html><body>ok</body></html>");

    const page = { setContent: vi.fn().mockResolvedValue(undefined), pdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) };
    const close = vi.fn().mockResolvedValue(undefined);
    const browser = { newPage: vi.fn().mockResolvedValue(page), close };
    mocks.launch.mockResolvedValue(browser as never);

    const req = new Request("https://reviewboost.app/api/report/analysis-1", { method: "GET", headers: { origin: "https://reviewboost.app" } });
    const res = await GET(req, { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    expect(res.headers.get("x-report-renderer")).toBe("puppeteer");
  });

  it("로그인되지 않은 사용자는 로그인으로 redirect", async () => {
    mocks.createSupabaseServerActionClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } })
      }
    });

    const req = new Request("https://reviewboost.app/api/report/analysis-1", { method: "GET", headers: { origin: "https://reviewboost.app" } });
    const res = await GET(req, { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("조회 실패 시 404 반환", async () => {
    const dbClient = makeDbClient({ data: null });
    dbClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    });
    mocks.createSupabaseServerActionClient.mockReturnValue(dbClient);

    const req = new Request("https://reviewboost.app/api/report/analysis-1", { method: "GET", headers: { origin: "https://reviewboost.app" } });
    const res = await GET(req, { params: Promise.resolve({ id: "analysis-1" }) });

    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).toBe("분석을 찾을 수 없습니다.");
  });
});
