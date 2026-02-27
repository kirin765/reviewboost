import { z } from "zod";
import { renderReportHtml } from "@/lib/report_html";
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

function asPdfBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("Puppeteer가 PDF 바이트 배열을 반환하지 않았습니다.");
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

  // Puppeteer가 설치되어 있고 chromium 실행이 가능한 환경에서만 동작합니다.
  // (로컬 개발/배포 환경에서는 보통 문제 없고, 제한된 샌드박스에선 실패할 수 있습니다.)
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
          "content-disposition": `attachment; filename="reviewboost-report.pdf"`,
          "x-report-renderer": "puppeteer"
        }
      });
    } finally {
      await browser.close();
    }
  } catch (e: unknown) {
    await logApiError({
      route: "/api/report",
      method: req.method,
      status: 501,
      code: "INTERNAL_ERROR",
      message: "PDF 생성 실패(브라우저 렌더링 실패).",
      details: getErrorMessage(e),
      request: req,
      error: e
    });
    const msg = getErrorMessage(e);

    return new Response(`PDF 생성에 실패했습니다.\n원인: Puppeteer 브라우저 실행 실패.\n${msg}`, {
      status: 501,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-report-renderer": "puppeteer-failed",
        "x-puppeteer-error": safeHeaderValue(msg)
      }
    });
  }
}
