import { getErrorMessage } from "@/types/common";
import { renderReportPdfBuffer } from "@/lib/report_pdfkit";
import type { AnalysisStats, Suggestions } from "@/types/review";

type SafeValue = unknown;

type PuppeteerErrorKind = "puppeteer_launch_error" | "puppeteer_pdf_error" | "puppeteer_timeout";
type PuppeteerTaggedError = Error & { kind?: PuppeteerErrorKind };

type ReportPuppeteerOptions = {
  executablePath?: string;
  maxRetries: number;
  launchTimeoutMs: number;
};

type ReportRenderInput = {
  html: string;
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: {
    filename?: string | null;
    createdAt?: string;
  };
};

type ReportRenderer = "puppeteer" | "pdfkit-fallback";

type ReportRenderSuccess = {
  ok: true;
  renderer: ReportRenderer;
  buffer: Buffer;
  allErrors: string[];
  fallbackReason?: string;
};

type ReportRenderFailure = {
  ok: false;
  allErrors: string[];
  puppeteerError?: string;
  fallbackError?: string;
};

export type ReportRenderResult = ReportRenderSuccess | ReportRenderFailure;

type PuppeteerPageLike = {
  setContent: (...args: unknown[]) => Promise<unknown>;
  pdf: (...args: unknown[]) => Promise<unknown>;
};

type PuppeteerBrowserLike = {
  newPage: () => Promise<PuppeteerPageLike>;
  close: () => Promise<unknown>;
};

const DEFAULT_PUPPETEER_MAX_RETRIES = 2;
const DEFAULT_PUPPETEER_LAUNCH_TIMEOUT_MS = 120000;

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return undefined;
  return parsed;
}

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

function parseNumberEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const n = toNumber(raw);
  if (n === undefined || !Number.isInteger(n) || n < 0) return fallback;
  return n;
}

function pushError(errors: string[], error: unknown, label: string, kind?: PuppeteerErrorKind) {
  const msg = getErrorMessage(error);
  const final = kind ? `${label} [${kind}]: ${msg}` : `${label}: ${msg}`;
  errors.push(final);
  return final;
}

function taggedPuppeteerError(error: unknown, kind: PuppeteerErrorKind): PuppeteerTaggedError {
  const next = new Error(`${kind}: ${getErrorMessage(error)}`) as PuppeteerTaggedError;
  next.kind = kind;
  return next;
}

function normalizePuppeteerReason(error: unknown): PuppeteerErrorKind {
  const typed = error as PuppeteerTaggedError;
  if (typed?.kind) return typed.kind;
  return "puppeteer_pdf_error";
}

function withTimeout<T>(promise: Promise<T>, ms: number, reason: PuppeteerErrorKind): Promise<T> {
  if (ms <= 0) return promise;

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(taggedPuppeteerError(`${reason} timeout`, "puppeteer_timeout"));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
}

async function runPuppeteerStep<T>(action: () => Promise<T>, reason: PuppeteerErrorKind, timeoutMs: number): Promise<T> {
  try {
    return await withTimeout(action(), timeoutMs, reason);
  } catch (error) {
    const tagged = (error as PuppeteerTaggedError)?.kind ? (error as PuppeteerTaggedError) : taggedPuppeteerError(error, reason);
    tagged.kind = tagged.kind ?? reason;
    throw tagged;
  }
}

async function renderWithPuppeteer(
  html: string,
  options: ReportPuppeteerOptions
): Promise<Buffer> {
  const mod = await import("puppeteer");
  const puppeteer = mod.default ?? mod;

  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-zygote"
  ];

  let attempt = 0;
  while (attempt <= options.maxRetries) {
    attempt += 1;
    let browser: PuppeteerBrowserLike;
    try {
      browser = (await runPuppeteerStep(
        () =>
          puppeteer.launch({
            headless: true,
            args: launchArgs,
            timeout: options.launchTimeoutMs,
            ...(options.executablePath ? { executablePath: options.executablePath } : {})
          }),
        "puppeteer_launch_error",
        options.launchTimeoutMs
      )) as PuppeteerBrowserLike;
      if (
        !browser ||
        typeof browser.newPage !== "function" ||
        typeof browser.close !== "function"
      ) {
        throw taggedPuppeteerError("Puppeteer launch returned invalid browser", "puppeteer_launch_error");
      }
    } catch (error) {
      if (attempt <= options.maxRetries) continue;
      throw error;
    }

      try {
      const page = await runPuppeteerStep<PuppeteerPageLike>(
        () => browser.newPage(),
        "puppeteer_pdf_error",
        options.launchTimeoutMs
      );
      await runPuppeteerStep(
        () => page.setContent(html, { waitUntil: "networkidle0" }),
        "puppeteer_pdf_error",
        options.launchTimeoutMs
      );
      const pdf = await runPuppeteerStep(
        () =>
          page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" }
          }),
        "puppeteer_pdf_error",
        options.launchTimeoutMs
      );
      return asPdfBuffer(pdf);
    } catch (error) {
      throw error;
    } finally {
      if (browser && typeof browser.close === "function") {
        await browser.close();
      }
    }
  }

  throw taggedPuppeteerError("Puppeteer 렌더링 실패", "puppeteer_timeout");
}

function getPuppeteerConfigFromEnv() {
  return {
    maxRetries: parseNumberEnv(process.env.PUPPETEER_MAX_RETRIES, DEFAULT_PUPPETEER_MAX_RETRIES),
    launchTimeoutMs: parseNumberEnv(process.env.PUPPETEER_LAUNCH_TIMEOUT_MS, DEFAULT_PUPPETEER_LAUNCH_TIMEOUT_MS),
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined
  };
}

export async function renderReportPdf(input: ReportRenderInput): Promise<ReportRenderResult> {
  const allErrors: string[] = [];
  const fallbackEnabled = parseBoolEnv(process.env.REPORT_ENABLE_PDFKIT_FALLBACK, true);
  const requirePuppeteerStyle = parseBoolEnv(process.env.REPORT_REQUIRE_PUPPETEER_STYLE, false);

  let puppeteerError: string | undefined;
  let puppeteerErrorKind: PuppeteerErrorKind | undefined;

  try {
    const buffer = await renderWithPuppeteer(input.html, getPuppeteerConfigFromEnv());
    return {
      ok: true,
      renderer: "puppeteer",
      buffer,
      allErrors
    };
  } catch (error) {
    puppeteerErrorKind = normalizePuppeteerReason(error);
    puppeteerError = pushError(allErrors, error, "Puppeteer 실패", puppeteerErrorKind);

    if (!fallbackEnabled) {
      return {
        ok: false,
        allErrors,
        puppeteerError,
        fallbackError: "PDFKit 폴백 비활성화(REPORT_ENABLE_PDFKIT_FALLBACK=0)"
      };
    }

    if (requirePuppeteerStyle) {
      return {
        ok: false,
        allErrors,
        puppeteerError,
        fallbackError: "PDFKit 폴백 비활성화(REPORT_REQUIRE_PUPPETEER_STYLE=1)"
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
  } catch (error) {
    const fallbackError = pushError(allErrors, error, "PDFKit 실패");
    return {
      ok: false,
      allErrors,
      puppeteerError,
      fallbackError
    };
  }
}

export type { ReportRenderInput, ReportRenderSuccess, ReportRenderFailure, ReportRenderer };
