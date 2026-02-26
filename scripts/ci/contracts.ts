import { accessSync, readFileSync } from "node:fs";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { z } from "zod";

const ROOT = process.cwd();
const REQUIRED_TESTS = ["src/lib/contracts.test.ts"];

const TYPES_PATH = path.resolve(ROOT, "src/lib/types.ts");
const API_ERROR_PATH = path.resolve(ROOT, "src/lib/api_error.ts");

const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    help: z.array(z.string()).optional(),
    details: z.string().optional()
  })
});

const SuggestionsSchema = z.object({
  detailPageCopy: z.array(z.string()),
  csResponseTemplates: z.array(z.string()),
  faqRecommendations: z.array(z.string()),
  notes: z.array(z.string())
});

const ClassifiedReviewSchema = z.object({
  text: z.string(),
  rating: z.number().nullable(),
  reviewedAt: z.string().nullable().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  category: z.enum(["배송", "품질", "가격", "사용성", "CS", "기타"])
});

const StatsSchema = z.object({
  total: z.number(),
  positive: z.number().nonnegative(),
  negative: z.number().nonnegative(),
  neutral: z.number().nonnegative(),
  positiveRatio: z.number().min(0).max(1),
  negativeRatio: z.number().min(0).max(1),
  avgRating: z.number().nullable(),
  negativeKeywordsTop10: z.array(
    z.object({
      keyword: z.string(),
      count: z.number().nonnegative()
    })
  ),
  categoryCounts: z.record(z.string(), z.number()),
  priorityScore: z.number(),
  recentness: z
    .object({
      hasDates: z.boolean(),
      last30Share: z.number().min(0).max(1),
      last90Share: z.number().min(0).max(1),
      last30NegativeRatio: z.number().nullable()
    })
    .partial()
    .optional()
});

const ReportHeadersSchema = z.object({
  "content-type": z.string().min(1),
  "content-disposition": z.string().min(1),
  "cache-control": z.string().min(1),
  "x-report-renderer": z.string().optional(),
  "x-puppeteer-error": z.string().optional()
});

const AnalysisContractSchema = z.object({
  stats: StatsSchema,
  suggestions: SuggestionsSchema,
  classified: z.array(ClassifiedReviewSchema),
  urgentReviews: z.array(z.object({ review: z.record(z.unknown()), highlightedText: z.string(), daysSinceWritten: z.number().nullable() })).optional(),
  priorityMatrix: z
    .array(
      z.object({
        category: z.string(),
        frequency: z.number().nonnegative(),
        frequencyPct: z.number().min(0),
        impact: z.number(),
        quadrant: z.enum(["critical", "monitor", "review", "observe"]),
        actionSummary: z.string()
      })
    )
    .optional(),
  ratingSimulation: z
    .object({
      currentAvg: z.number(),
      scenarios: z.array(
        z.object({
          label: z.string(),
          resolvedCount: z.number().nonnegative(),
          newAvg: z.number(),
          delta: z.number(),
          relatedKeywords: z.array(z.string())
        })
      )
    })
    .optional(),
  positiveKeywords: z
    .array(
      z.object({
        keyword: z.string(),
        count: z.number().nonnegative(),
        sentiment: z.literal("positive")
      })
    )
    .optional(),
  actionItems: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        relatedKeyword: z.string(),
        reviewCount: z.number().nonnegative(),
        impact: z.enum(["high", "medium", "low"]),
        category: z.enum(["detailPage", "csResponse", "faq"])
      })
    )
    .optional(),
  llmStats: z
    .object({
      targetCount: z.number().nonnegative(),
      maxLlmReviews: z.number().nonnegative(),
      usedHeuristicMode: z.string(),
      diagnostics: z.array(z.string())
    })
    .partial()
    .optional(),
  meta: z
    .object({
      filename: z.string().nullable(),
      stored: z.boolean(),
      truncated: z.boolean(),
      storageAttempted: z.boolean(),
      storageError: z.string().nullable().optional(),
      storageStep: z.string().nullable().optional(),
      analysisId: z.string().nullable().optional()
    })
    .passthrough()
});

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function resolvePath(filePath: string) {
  return path.resolve(ROOT, filePath);
}

function ensureFiles() {
  const required = [...REQUIRED_TESTS, "src/lib/types.ts", "src/lib/api_error.ts"];
  for (const file of required) {
    try {
      accessSync(resolvePath(file), constants.F_OK);
    } catch {
      console.error(`[CI] 필수 파일 누락: ${file}`);
      process.exit(1);
    }
  }
}

function runCommand(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8"
  });

  if (!result) {
    return { status: 1, stdout: "", stderr: "command spawn failed" };
  }

  return {
    status: result.status,
    stdout: result.stdout ? String(result.stdout) : "",
    stderr: result.stderr ? String(result.stderr) : ""
  };
}

function parseApiErrorCodesFromTypes(text: string): string[] {
  const marker = text.match(/export type ApiErrorCode\s*=\s*([\s\S]*?);/);
  if (!marker) return [];

  const codeBlock = marker[1];
  const codes = new Set<string>();
  const matcher = /"([A-Z0-9_]+)"/g;
  for (const match of codeBlock.matchAll(matcher)) {
    codes.add(match[1]!);
  }
  return Array.from(codes);
}

function parseApiErrorStatusMapFromSource(text: string): Record<string, number> {
  const marker = text.match(/export const apiErrorStatus\s*:\s*[^=]*=\s*{([\s\S]*?)\n};/);
  if (!marker) return {};

  const mapBlock = marker[1];
  const statusMap: Record<string, number> = {};
  const matcher = /^\s*([A-Z_]+)\s*:\s*([0-9]{3})/gm;
  for (const match of mapBlock.matchAll(matcher)) {
    const code = match[1];
    const status = Number.parseInt(match[2]!, 10);
    if (Number.isFinite(status)) {
      statusMap[code] = status;
    }
  }
  return statusMap;
}

function assertContractParity() {
  const apiTypesRaw = readFileSync(TYPES_PATH, "utf8");
  const apiErrorRaw = readFileSync(API_ERROR_PATH, "utf8");

  const declaredCodes = parseApiErrorCodesFromTypes(apiTypesRaw).sort();
  const statusMap = parseApiErrorStatusMapFromSource(apiErrorRaw);
  const mappedCodes = Object.keys(statusMap).sort();

  const declaredSet = new Set(declaredCodes);
  const mappedSet = new Set(mappedCodes);
  const missingInMap = declaredCodes.filter((code) => !mappedSet.has(code));
  const mappedNotDeclared = mappedCodes.filter((code) => !declaredSet.has(code));

  if (missingInMap.length > 0) {
    throw new Error(`ApiErrorStatusMap에 미등록 코드가 있습니다: ${missingInMap.join(", ")}`);
  }
  if (mappedNotDeclared.length > 0) {
    throw new Error(`api_error.ts가 타입에 없는 코드를 정의했습니다: ${mappedNotDeclared.join(", ")}`);
  }

  for (const [code, status] of Object.entries(statusMap)) {
    if (status < 100 || status >= 600) {
      throw new Error(`잘못된 HTTP 상태 코드 매핑: ${code} => ${status}`);
    }
  }
}

function validateApiEnvelopeSamples() {
  const apiErrorSource = readFileSync(API_ERROR_PATH, "utf8");
  const statusMatch = /export const apiErrorStatus\s*:\s*ApiErrorStatusMap\s*=\s*{([\s\S]*?)\n};/.exec(apiErrorSource);
  const mapText = statusMatch?.[1] ?? "";

  const statusMapEntries = new Set<string>();
  const matcher = /^\s*([A-Z_]+)\s*:\s*([0-9]{3})/gm;
  for (const match of mapText.matchAll(matcher)) {
    statusMapEntries.add(match[1]);
    const code = match[1];
    const status = match[2];
    const envelope = {
      error: {
        code,
        message: `${code} contract smoke`,
        help: ["테스트 검증용"],
        details: `mapped status: ${status}`
      }
    };
    ApiErrorSchema.parse(envelope);
  }

  if (statusMapEntries.size === 0) {
    throw new Error("ApiErrorStatusMap를 읽어올 수 없습니다.");
  }
}

function validateAnalyzeAndReportContracts() {
  const sampleAnalysis = {
    stats: {
      total: 2,
      positive: 1,
      negative: 0,
      neutral: 1,
      positiveRatio: 0.5,
      negativeRatio: 0,
      avgRating: 4.2,
      negativeKeywordsTop10: [{ keyword: "배송", count: 1 }],
      categoryCounts: {
        배송: 1,
        품질: 0,
        가격: 0,
        사용성: 0,
        CS: 0,
        기타: 1
      },
      priorityScore: 12.34
    },
    suggestions: {
      detailPageCopy: ["강점/개선안"],
      csResponseTemplates: ["템플릿1"],
      faqRecommendations: ["FAQ1"],
      notes: ["주의"]
    },
    classified: [
      {
        text: "좋은 상품입니다",
        rating: 5,
        reviewedAt: "2026-02-20T00:00:00.000Z",
        sentiment: "positive",
        category: "품질"
      }
    ],
    urgentReviews: [
      {
        review: {
          text: "배송이 늦었어요",
          rating: 2,
          reviewedAt: "2026-02-01T00:00:00.000Z",
          sentiment: "negative",
          category: "배송"
        },
        highlightedText: "배송",
        daysSinceWritten: 2
      }
    ],
    priorityMatrix: [
      {
        category: "배송",
        frequency: 1,
        frequencyPct: 0.5,
        impact: 70,
        quadrant: "monitor",
        actionSummary: "문구 개선 필요"
      }
    ],
    ratingSimulation: {
      currentAvg: 4.2,
      scenarios: [
        {
          label: "낙관 시나리오",
          resolvedCount: 1,
          newAvg: 4.4,
          delta: 0.2,
          relatedKeywords: ["가격"]
        }
      ]
    },
    positiveKeywords: [
      { keyword: "훌륭", count: 3, sentiment: "positive" }
    ],
    actionItems: [
      {
        id: "ai-01",
        action: "FAQ 업데이트",
        relatedKeyword: "배송",
        reviewCount: 4,
        impact: "high",
        category: "faq"
      }
    ],
    meta: {
      filename: "sample.csv",
      stored: false,
      truncated: false,
      storageAttempted: false,
      storageError: null,
      storageStep: null,
      analysisId: null
    },
    llmStats: {
      targetCount: 1,
      maxLlmReviews: 60,
      usedHeuristicMode: "negative-first",
      diagnostics: ["OK"]
    }
  };

  AnalysisContractSchema.parse(sampleAnalysis);

  const reportSuccessHeaders = {
    "content-type": "application/pdf",
    "content-disposition": 'attachment; filename="review-report.pdf"',
    "cache-control": "public, max-age=0"
  };
  const reportFailHeaders = {
    "content-type": "application/json",
    "content-disposition": "inline",
    "cache-control": "no-store",
    "x-report-renderer": "puppeteer",
    "x-puppeteer-error": "render timeout"
  };
  ReportHeadersSchema.extend({ "content-type": z.literal("application/pdf") }).parse(reportSuccessHeaders);
  ReportHeadersSchema.parse(reportFailHeaders);
}

async function run() {
  ensureFiles();
  assertContractParity();
  validateApiEnvelopeSamples();
  validateAnalyzeAndReportContracts();

  const contractTest = runCommand("npx", ["vitest", "run", ...REQUIRED_TESTS]);
  if (contractTest.status !== 0) {
    console.error(contractTest.stderr || contractTest.stdout);
    process.exit(contractTest.status ?? 1);
  }

  console.log("[CI] 계약 스키마 검증 통과");
}

run().catch((error) => {
  console.error("[CI] 계약 체크 실패", error);
  process.exit(1);
});
