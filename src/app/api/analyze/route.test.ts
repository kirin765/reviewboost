import { describe, expect, it, vi } from "vitest";
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
  getSupabaseAdminClient: vi.fn(),
  createSupabaseServerActionClient: vi.fn(),
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

vi.mock("@/lib/supabase_server", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: mocks.createSupabaseServerActionClient
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

function runResponsePayload() {
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

function makeAdminClientForFailedStorage(insertErrorMessage: string) {
  const single = vi.fn().mockResolvedValue({ error: { message: insertErrorMessage } });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { from };
}

function makeSupabaseClientWithAuth(userId = "user-1") {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId, email: "test@example.com" } } }) }
  };
}

describe("POST /api/analyze", () => {
  it("returns analysis payload even when storage is skipped", async () => {
    mocks.readUploadedCsvText.mockResolvedValue({
      filename: "reviews.csv",
      csvText: ["review,rating", "좋아요,5"].join("\n"),
      form: new FormData()
    });
    mocks.runAnalysisPipeline.mockResolvedValue(runResponsePayload());
    mocks.resolvePlanTierForUser.mockResolvedValue("free");
    mocks.monthlyLimitForPlan.mockReturnValue(null);
    mocks.getCapabilitiesBase.mockReturnValue({ supabaseConfigured: false });
    mocks.devForcedAnalysisMode.mockReturnValue("auto" as never);
    mocks.devAllowAdvancedAiBypass.mockReturnValue(false);
    mocks.getGatesForPlan.mockReturnValue({ allowLLM: true, maxReviewsPerAnalysis: 1000 } as never);

    const res = await POST(
      new Request("https://reviewboost.app/api/analyze", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.storageAttempted).toBe(false);
    expect(payload.meta.stored).toBe(false);
  });

  it("저장 실패가 발생해도 200 분석 결과는 반환한다", async () => {
    mocks.readUploadedCsvText.mockResolvedValue({
      filename: "reviews.csv",
      csvText: ["review,rating", "좋아요,5"].join("\n"),
      form: new FormData()
    });
    mocks.runAnalysisPipeline.mockResolvedValue(runResponsePayload());
    mocks.resolvePlanTierForUser.mockResolvedValue("basic");
    mocks.monthlyLimitForPlan.mockReturnValue(null);
    mocks.getCapabilitiesBase.mockReturnValue({ supabaseConfigured: true });
    mocks.devForcedAnalysisMode.mockReturnValue("auto" as never);
    mocks.devAllowAdvancedAiBypass.mockReturnValue(false);
    mocks.getGatesForPlan.mockReturnValue({ allowLLM: true, maxReviewsPerAnalysis: 1000 } as never);
    mocks.getSupabaseAdminClient.mockReturnValue(makeAdminClientForFailedStorage("insert failed"));
    mocks.createSupabaseServerActionClient.mockReturnValue(makeSupabaseClientWithAuth());

    const res = await POST(
      new Request("https://reviewboost.app/api/analyze", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.storageAttempted).toBe(true);
    expect(payload.meta.storageError).toContain("analyses_insert_admin_failed");
  });

  it("analysis pipeline fallback meta가 응답에 유지된다", async () => {
    const fallbackPayload = runResponsePayload();
    fallbackPayload.payload.meta.aiFallbackReason = "time_budget_exhausted";
    fallbackPayload.payload.meta.llmApplied = false;
    mocks.readUploadedCsvText.mockResolvedValue({
      filename: "reviews.csv",
      csvText: ["review,rating", "좋아요,5"].join("\n"),
      form: new FormData()
    });
    mocks.runAnalysisPipeline.mockResolvedValue(fallbackPayload);
    mocks.resolvePlanTierForUser.mockResolvedValue("free");
    mocks.monthlyLimitForPlan.mockReturnValue(null);
    mocks.getCapabilitiesBase.mockReturnValue({ supabaseConfigured: false });
    mocks.devForcedAnalysisMode.mockReturnValue("auto" as never);
    mocks.devAllowAdvancedAiBypass.mockReturnValue(false);
    mocks.getGatesForPlan.mockReturnValue({ allowLLM: true, maxReviewsPerAnalysis: 1000 } as never);

    const res = await POST(
      new Request("https://reviewboost.app/api/analyze", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.meta.aiFallbackReason).toBe("time_budget_exhausted");
    expect(payload.meta.llmApplied).toBe(false);
  });
});
