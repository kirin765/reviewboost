import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { renderReportHtml } from "@/lib/report_html";
import { renderReportPdfBuffer } from "@/lib/report_pdfkit";

export const runtime = "nodejs";

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let analysis: any;
  try {
    const supabase = createSupabaseServerActionClient();
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
      .single();

    if (error || !data) return textError(404, "분석을 찾을 수 없습니다.");
    analysis = data;
  } catch (e: any) {
    return textError(500, e?.message ?? String(e));
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
          "content-disposition": `attachment; filename="reviewboost-report-${analysis.id}.pdf"`
        }
      });
    } finally {
      await browser.close();
    }
  } catch (e: any) {
    try {
      const buf = await renderReportPdfBuffer({
        title: "ReviewBoost 요약 리포트",
        stats: analysis.stats,
        suggestions: analysis.suggestions,
        meta: { filename: analysis.input_filename ?? null, createdAt: analysis.created_at }
      });
      return new Response(buf as any, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="reviewboost-report-${analysis.id}.pdf"`,
          "x-report-renderer": "pdfkit",
          "x-puppeteer-error": String(e?.message ?? e ?? "")
        }
      });
    } catch (e2: any) {
      return textError(
        501,
        `PDF 생성 실패(Puppeteer 실패 + PDFKit 폰트 없음):\n${String(e2?.message ?? e2 ?? "")}`
      );
    }
  }
}
