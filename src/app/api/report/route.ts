import { z } from "zod";
import { renderReportHtml } from "@/lib/report_html";
import { renderReportPdfBuffer } from "@/lib/report_pdfkit";

export const runtime = "nodejs";

const AnalysisSchema = z.object({
  stats: z.any(),
  suggestions: z.any(),
  meta: z
    .object({
      filename: z.string().nullable().optional()
    })
    .optional()
});

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return textError(400, "JSON 바디가 필요합니다.");
  }

  const parsed = AnalysisSchema.safeParse(body);
  if (!parsed.success) return textError(400, "요청 형식이 올바르지 않습니다.");

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
      return new Response(pdf as any, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="reviewboost-report.pdf"`
        }
      });
    } finally {
      await browser.close();
    }
  } catch (e: any) {
    // Fallback: PDFKit (no headless browser dependency).
    try {
      const buf = await renderReportPdfBuffer({
        title: "ReviewBoost 요약 리포트",
        stats,
        suggestions,
        meta: { filename: meta?.filename ?? null, createdAt: new Date().toISOString() }
      });
      return new Response(buf as any, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="reviewboost-report.pdf"`,
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
