import { getErrorMessage } from "@/types/common";
import { renderReportPdfBuffer } from "@/lib/report_pdfkit";
import type { AnalysisStats, Suggestions } from "@/types/review";

type SafeValue = unknown;

export type ReportRenderer = "puppeteer" | "pdfkit-fallback";

export type ReportRenderSuccess = {
  ok: true;
  renderer: ReportRenderer;
  buffer: Buffer;
  allErrors: string[];
  fallbackReason?: string;
};

export type ReportRenderFailure = {
  ok: false;
  allErrors: string[];
  puppeteerError?: string;
  fallbackError?: string;
};

export type ReportRenderResult = ReportRenderSuccess | ReportRenderFailure;

export type ReportRenderInput = {
  html: string;
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: {
    filename?: string | null;
    createdAt?: string;
  };
};

function asPdfBuffer(value: SafeValue): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  throw new Error("Puppeteer가 PDF 바이트 배열을 반환하지 않았습니다.");
}

function parseBoolEnv(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const v = raw.trim().toLowerCase();
  if (!v) return fallback;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function pushError(errors: string[], error: unknown, label: string) {
  const msg = getErrorMessage(error);
  errors.push(`${label}: ${msg}`);
  return msg;
}

async function renderWithPuppeteer(html: string): Promise<Buffer> {
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
    return asPdfBuffer(pdf);
  } finally {
    await browser.close();
  }
}

export async function renderReportPdf(input: ReportRenderInput): Promise<ReportRenderResult> {
  const allErrors: string[] = [];
  const fallbackEnabled = parseBoolEnv(process.env.REPORT_ENABLE_PDFKIT_FALLBACK, true);

  let puppeteerError: string | undefined;

  try {
    const buffer = await renderWithPuppeteer(input.html);
    return {
      ok: true,
      renderer: "puppeteer",
      buffer,
      allErrors
    };
  } catch (error: unknown) {
    puppeteerError = pushError(allErrors, error, "Puppeteer 실패");
    if (!fallbackEnabled) {
      return {
        ok: false,
        allErrors,
        puppeteerError
      };
    }
  }

  try {
    const buffer = await renderReportPdfBuffer({
      title: input.title,
      stats: input.stats,
      suggestions: input.suggestions,
      meta: input.meta,
      requireKoreanFont: true
    });

    return {
      ok: true,
      renderer: "pdfkit-fallback",
      buffer,
      allErrors,
      fallbackReason: "puppeteer-failed"
    };
  } catch (error: unknown) {
    const fallbackError = pushError(allErrors, error, "PDFKit 실패");
    return {
      ok: false,
      allErrors,
      puppeteerError,
      fallbackError
    };
  }
}
