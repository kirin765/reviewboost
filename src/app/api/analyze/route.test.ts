import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AnalysisPipelineOutput } from "@/lib/analysis_pipeline";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  readUploadedCsvText: vi.fn(),
  runAnalysisPipeline: vi.fn(),
  resolvePlanTierForUser: vi.fn(),
  monthlyLimitForPlan: vi.fn(),
  getCapabilitiesBase: vi.fn(),
  monthStartIso: vi.fn(),
  devForcedAnalysisMode: vi.fn(),
  devAllowAdvancedAiBypass: vi.fn(),
  getGatesForPlan: vi.fn(),
  authFn: vi.fn(),
  currentUser: vi.fn(),
  reserveMonthlyQuotaSlot: vi.fn(),
  finalizePersistAndRespond: vi.fn(),
  releaseAnalysisSlot: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/upload_csv", () => ({
  readUploadedCsvText: mocks.readUploadedCsvText
}));

vi.mock("@/lib/analysis_pipeline", () => ({
  runAnalysisPipeline: mocks.runAnalysisPipeline
}));

vi.mock("@/lib/plan", () => ({
  monthStartIso: mocks.monthStartIso,
  monthlyLimitForPlan: mocks.monthlyLimitForPlan,
  resolvePlanTierForUser: mocks.resolvePlanTierForUser
}));

vi.mock("@/lib/capabilities", () => ({
  getCapabilitiesBase: mocks.getCapabilitiesBase
}));

vi.mock("@/lib/dev_flags", () => ({
  devForcedAnalysisMode: mocks.devForcedAnalysisMode,
  devAllowAdvancedAiBypass: mocks.devAllowAdvancedAiBypass
}));

vi.mock("@/lib/plan_gates", () => ({
  getGatesForPlan: mocks.getGatesForPlan
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.authFn,
  currentUser: mocks.currentUser
}));

vi.mock("./_helpers/quota", () => ({
  reserveMonthlyQuotaSlot: mocks.reserveMonthlyQuotaSlot
}));

vi.mock("@/lib/db/queries", () => ({
  releaseAnalysisSlot: mocks.releaseAnalysisSlot
}));

vi.mock("./_helpers/persistence", async () => {
  const actual = await vi.importActual<typeof import("./_helpers/persistence")>("./_helpers/persistence");
  return {
    ...actual,
    finalizePersistAndRespond: mocks.finalizePersistAndRespond
  };
});

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

function runResponsePayload(): AnalysisPipelineOutput {
  return {
    payload: {
      stats: {
        total: 1,
        positive: 1,
        negative: 0,
        neutral: 0,
        positiveRatio: 1,
        negativeRatio: 0,
        avgRating: 4.5,
        negativeKeywordsTop10: [],
        categoryCounts: {
          배송: 0,
          품질: 1,
          가격: 0,
          사용성: 0,
          CS: 0,
          기타: 0
        },
        priorityScore: 12.3,
        recentness: { hasDates: true, last30Share: 0.5, last90Share: 0.8, last30NegativeRatio: 0 }
      },
      suggestions: {
        detailPageCopy: ["d1", "d2", "d3"],
        csResponseTemplates: ["c1", "c2"],
        faqRecommendations: ["f1", "f2", "f3"],
        notes: ["n1"]
      },
      classified: [{ text: "좋아요", rating: 5, reviewedAt: "2026-01-01T00:00:00.000Z", sentiment: "positive", category: "품질" }],
      meta: {
        filename: null,
        stored: false,
        truncated: false
      }
    },
    classified: [{ text: "좋아요", rating: 5, reviewedAt: "2026-01-01T00:00:00.000Z", sentiment: "positive", category: "품질" }]
  };
}

function makeRequest() {
  return new Request("https://reviewboost.app/api/analyze", {
    method: "POST",
    headers: { origin: "https://reviewboost.app" }
  });
}

function setupCommonMocks() {
  mocks.readUploadedCsvText.mockResolvedValue({
    filename: "reviews.csv",
    csvText: ["review,rating", "좋아요,5"].join("\n"),
    form: new FormData()
  });
  mocks.runAnalysisPipeline.mockResolvedValue(runResponsePayload());
  mocks.resolvePlanTierForUser.mockResolvedValue("free");
  mocks.monthlyLimitForPlan.mockReturnValue(null);
  mocks.monthStartIso.mockReturnValue("2026-01-01T00:00:00.000Z");
  mocks.devForcedAnalysisMode.mockReturnValue("auto" as never);
  mocks.devAllowAdvancedAiBypass.mockReturnValue(false);
  mocks.getGatesForPlan.mockReturnValue({ allowLLM: true, maxReviewsPerAnalysis: 1000 } as never);
  mocks.reserveMonthlyQuotaSlot.mockResolvedValue({ analysisId: "analysis-1" });
  mocks.finalizePersistAndRespond.mockResolvedValue(null);
  mocks.releaseAnalysisSlot.mockResolvedValue(undefined);
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCommonMocks();
  });

  it("게스트(미인증)는 저장을 시도하지 않고 분석 결과를 반환한다", async () => {
    mocks.getCapabilitiesBase.mockReturnValue({ databaseConfigured: true, authConfigured: false, openaiConfigured: true });
    mocks.authFn.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.storageAttempted).toBe(false);
    expect(payload.meta.stored).toBe(false);
    expect(mocks.reserveMonthlyQuotaSlot).not.toHaveBeenCalled();
    expect(mocks.finalizePersistAndRespond).not.toHaveBeenCalled();
  });

  it("인증 사용자는 Drizzle 저장 경로로 결과를 반환한다", async () => {
    mocks.getCapabilitiesBase.mockReturnValue({ databaseConfigured: true, authConfigured: true, openaiConfigured: true });
    mocks.authFn.mockResolvedValue({ userId: "user-1" });
    mocks.currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "test@example.com" }] });
    mocks.finalizePersistAndRespond.mockImplementation(async (input: any) => {
      input.storageStatus.success = true;
      input.storageStatus.analysisId = "analysis-1";
      input.storageStatus.error = null;
      return Response.json({ meta: { stored: true, storageAttempted: true, analysisId: "analysis-1" } });
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.stored).toBe(true);
    expect(payload.meta.analysisId).toBe("analysis-1");
    expect(mocks.reserveMonthlyQuotaSlot).toHaveBeenCalledTimes(1);
    expect(mocks.finalizePersistAndRespond).toHaveBeenCalledTimes(1);
  });

  it("저장 실패가 발생해도 200 분석 결과는 반환한다", async () => {
    mocks.getCapabilitiesBase.mockReturnValue({ databaseConfigured: true, authConfigured: true, openaiConfigured: true });
    mocks.authFn.mockResolvedValue({ userId: "user-1" });
    mocks.currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "test@example.com" }] });
    mocks.finalizePersistAndRespond.mockRejectedValue(new Error("insert failed"));

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.storageAttempted).toBe(true);
    expect(payload.meta.stored).toBe(false);
    expect(payload.meta.storageError).toContain("insert failed");
  });

  it("analysis pipeline fallback meta가 응답에 유지된다", async () => {
    const fallbackPayload = runResponsePayload();
    fallbackPayload.payload.meta.aiFallbackReason = "time_budget_exhausted";
    fallbackPayload.payload.meta.llmApplied = false;
    mocks.runAnalysisPipeline.mockResolvedValue(fallbackPayload);
    mocks.getCapabilitiesBase.mockReturnValue({ databaseConfigured: true, authConfigured: false, openaiConfigured: true });
    mocks.authFn.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.aiFallbackReason).toBe("time_budget_exhausted");
    expect(payload.meta.llmApplied).toBe(false);
  });
});
