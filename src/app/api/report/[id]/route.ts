import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { renderReportHtml } from "@/lib/report_html";
import { logApiError } from "@/lib/api_log";

export const runtime = "nodejs";

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

function safeHeaderValue(value: unknown) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, 400);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let analysis: any;
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
    analysis = data;
  } catch (error: any) {
    await logApiError({
      route: "/api/report/[id]",
      method: req.method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "리포트 조회 중 오류가 발생했습니다.",
      details: error?.message ?? String(error ?? "unknown"),
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
      return new Response(pdf as any, {
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
  } catch (e: any) {
    await logApiError({
      route: "/api/report/[id]",
      method: req.method,
      status: 501,
      code: "INTERNAL_ERROR",
      message: "PDF 생성 실패(브라우저 렌더링 실패).",
      details: e?.message ?? String(e ?? ""),
      request: req,
      error: e,
      extra: { analysisId: analysis.id }
    });

    return new Response(`PDF 생성에 실패했습니다.\n원인: Puppeteer 브라우저 실행 실패.\n${String(e?.message ?? e ?? "")}`, {
      status: 501,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-report-renderer": "puppeteer-failed",
        "x-puppeteer-error": safeHeaderValue(e?.message ?? e ?? "")
      }
    });
  }
}
