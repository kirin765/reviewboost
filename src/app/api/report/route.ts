import { z } from "zod";
import { renderReportHtml } from "@/lib/report_html";
import { renderReportPdf, type ReportRenderFailure, type ReportRenderSuccess } from "@/lib/report_renderer";
import { logApiError } from "@/lib/api_log";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";

const AnalysisStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  positive: z.number().int().nonnegative(),
  negative: z.number().int().nonnegative(),
  neutral: z.number().int().nonnegative(),
  positiveRatio: z.number().finite(),
  negativeRatio: z.number().finite(),
  avgRating: z.number().finite().nullable(),
  negativeKeywordsTop10: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().nonnegative()
    })
  ),
  categoryCounts: z.record(z.number().finite().nonnegative()),
  priorityScore: z.number().finite(),
  recentness: z
    .object({
      hasDates: z.boolean(),
      last30Share: z.number().finite(),
      last90Share: z.number().finite(),
      last30NegativeRatio: z.number().finite().nullable()
    })
    .optional()
});

const SuggestionsSchema = z.object({
  detailPageCopy: z.array(z.string()),
  csResponseTemplates: z.array(z.string()),
  faqRecommendations: z.array(z.string()),
  notes: z.array(z.string())
});

const AnalysisSchema = z.object({
  stats: AnalysisStatsSchema,
  suggestions: SuggestionsSchema,
  meta: z
    .object({
      filename: z.string().nullable().optional()
    })
    .optional()
});

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function safeHeaderValue(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 400);
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await logApiError({
      route: "/api/report",
      method: req.method,
      status: 400,
      code: "INTERNAL_ERROR",
      message: "JSON 파싱에 실패했습니다.",
      details: "요청 바디를 파싱할 수 없습니다.",
      request: req
    });
    return textError(400, "JSON 바디가 필요합니다.");
  }

  const parsed = AnalysisSchema.safeParse(body);
  if (!parsed.success) {
    await logApiError({
      route: "/api/report",
      method: req.method,
      status: 400,
      code: "INTERNAL_ERROR",
      message: "요청 형식이 올바르지 않습니다.",
      details: parsed.error.message,
      request: req
    });
    return textError(400, "요청 형식이 올바르지 않습니다.");
  }

  const { stats, suggestions, meta } = parsed.data;
  const html = renderReportHtml({
    title: "ReviewBoost 요약 리포트",
    stats,
    suggestions,
    meta: { filename: meta?.filename ?? null, createdAt: new Date().toISOString() }
  });

  try {
    const renderResult = await renderReportPdf({
      html,
      title: "ReviewBoost 요약 리포트",
      stats,
      suggestions,
      meta: { filename: meta?.filename ?? null, createdAt: new Date().toISOString() }
    });

    if (!renderResult.ok) {
      const failure = renderResult;
      const errors = [...failure.allErrors];
      const fallbackError = failure.fallbackError ? safeHeaderValue(failure.fallbackError) : undefined;
      const puppeteerError = failure.puppeteerError ? safeHeaderValue(failure.puppeteerError) : errors[0];

      await logApiError({
        route: "/api/report",
        method: req.method,
        status: 501,
        code: "INTERNAL_ERROR",
        message: "PDF 생성 실패(브라우저 렌더링 실패).",
        details: errors.join(" | "),
        request: req,
        error: failure,
        extra: {
          reportErrors: errors,
          puppeteerError: failure.puppeteerError ?? null,
          fallbackError: failure.fallbackError ?? null
        }
      });

      const msg = `${failure.fallbackError ? `${failure.fallbackError} | ` : ""}${failure.puppeteerError || errors.join(" | ")}`;
      return new Response(`PDF 생성에 실패했습니다.\n원인: Puppeteer 브라우저 실행 실패.\n${msg}`, {
        status: 501,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "x-report-renderer": "puppeteer-failed",
          ...(puppeteerError ? { "x-puppeteer-error": safeHeaderValue(puppeteerError) } : {}),
          ...(fallbackError ? { "x-report-fallback-error": safeHeaderValue(fallbackError) } : {})
        }
      });
    }

    const { buffer, renderer } = renderResult as ReportRenderSuccess;
    const headers: Record<string, string> = {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="reviewboost-report.pdf"`,
      "x-report-renderer": renderer
    };

    if (renderer === "pdfkit-fallback") {
      const puppeteerError =
        renderResult.allErrors.find((entry) => entry.toLowerCase().includes("puppeteer")) ??
        renderResult.allErrors[0];
      const fallbackError =
        renderResult.fallbackReason ??
        renderResult.allErrors[renderResult.allErrors.length - 1] ??
        renderResult.allErrors[0];

      if (puppeteerError) {
        headers["x-puppeteer-error"] = safeHeaderValue(puppeteerError);
      }
      if (fallbackError) {
        headers["x-report-fallback-error"] = safeHeaderValue(fallbackError);
      }
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers
    });
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    await logApiError({
      route: "/api/report",
      method: req.method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "PDF 생성 중 내부 예외가 발생했습니다.",
      details: message,
      request: req,
      error: e
    });

    return new Response(`PDF 생성에 실패했습니다.\n원인: 내부 예외.\n${message}`, {
      status: 500,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-report-renderer": "puppeteer-failed",
        "x-puppeteer-error": safeHeaderValue(message)
      }
    });
  }
}
