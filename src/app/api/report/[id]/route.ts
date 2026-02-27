import { z } from "zod";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { renderReportHtml } from "@/lib/report_html";
import { logApiError } from "@/lib/api_log";
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

const AnalysisRecordSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  input_filename: z.string().nullable().optional(),
  stats: AnalysisStatsSchema,
  suggestions: SuggestionsSchema
});

type AnalysisRecord = z.infer<typeof AnalysisRecordSchema>;

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function safeHeaderValue(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 400);
}

function asPdfBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("Puppeteer가 PDF 바이트 배열을 반환하지 않았습니다.");
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let analysis: AnalysisRecord | null = null;
  try {
    const supabase = await createSupabaseServerActionClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      const url = new URL(req.url);
      url.pathname = "/login";
      url.search = `next=${encodeURIComponent(`/api/report/${id}`)}`;
      return Response.redirect(url, 307);
    }

    const { data, error } = await supabase
      .from("analyses")
      .select("id, created_at, input_filename, stats, suggestions")
      .eq("id", id)
      .eq("user_id", userData.user.id)
      .single();

    if (error || !data) return textError(404, "분석을 찾을 수 없습니다.");

    const parsed = AnalysisRecordSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    analysis = parsed.data;
  } catch (error: unknown) {
    await logApiError({
      route: "/api/report/[id]",
      method: req.method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "리포트 조회 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error,
      extra: { analysisId: id }
    });
    return textError(500, "리포트 생성 중 오류가 발생했습니다.");
  }

  const html = renderReportHtml({
    title: "ReviewBoost 요약 리포트",
    stats: analysis.stats,
    suggestions: analysis.suggestions,
    meta: { filename: analysis.input_filename ?? null, createdAt: analysis.created_at }
  });

  try {
    const mod = await import("puppeteer");
    const puppeteer = mod.default ?? mod;
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" }
      });
      const pdfBuffer = asPdfBuffer(pdf);
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="reviewboost-report-${analysis.id}.pdf"`,
          "x-report-renderer": "puppeteer"
        }
      });
    } finally {
      await browser.close();
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    await logApiError({
      route: "/api/report/[id]",
      method: req.method,
      status: 501,
      code: "INTERNAL_ERROR",
      message: "PDF 생성 실패(브라우저 렌더링 실패).",
      details: message,
      request: req,
      error,
      extra: { analysisId: analysis?.id ?? id }
    });

    return new Response(`PDF 생성에 실패했습니다.\n원인: Puppeteer 브라우저 실행 실패.\n${message}`, {
      status: 501,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-report-renderer": "puppeteer-failed",
        "x-puppeteer-error": safeHeaderValue(message)
      }
    });
  }
}
