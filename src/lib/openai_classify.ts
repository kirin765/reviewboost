import OpenAI from "openai";
import type { Category, Sentiment } from "@/lib/types";
import { env } from "@/lib/config";

export type LlmClassification = { sentiment: Sentiment; category: Category };

export type LlmClassificationResult = {
  classifications: LlmClassification[];
  appliedCount: number;
  requestedCount: number;
  failedBatchCount: number;
};

const VALID_SENTIMENT: Sentiment[] = ["positive", "neutral", "negative"];
const VALID_CATEGORY: Category[] = ["배송", "품질", "가격", "사용성", "CS", "기타"];
const DEFAULT_CLASSIFY_TIMEOUT_MS = 12000;
const CLASSIFY_TIMEOUT_GUARD_MS = 2000;
const DEFAULT_CLASSIFY_BATCH_SIZE = 60;
const DEFAULT_CLASSIFY_MAX_CONCURRENCY = 2;

function coerceSentiment(v: unknown): Sentiment {
  return typeof v === "string" && VALID_SENTIMENT.includes(v as Sentiment) ? (v as Sentiment) : "neutral";
}

function coerceCategory(v: unknown): Category {
  return typeof v === "string" && VALID_CATEGORY.includes(v as Category) ? (v as Category) : "기타";
}

function toMapById(items: readonly unknown[]): Map<number, LlmClassification> {
  const out = new Map<number, LlmClassification>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const rawId = candidate.id;
    const id = typeof rawId === "number" ? rawId : Number(rawId);
    if (!Number.isFinite(id)) continue;
    out.set(Math.trunc(id), {
      sentiment: coerceSentiment(candidate.sentiment),
      category: coerceCategory(candidate.category)
    });
  }

  return out;
}

function parseOpenAiResponse(raw: string): unknown[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.items)) return null;
  return candidate.items;
}

function normalizeTimeout(raw: number | string, fallback: number): number {
  const parsedTimeoutMs = typeof raw === "string" ? Number(raw) : raw;
  return Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs >= 3000 ? Math.floor(parsedTimeoutMs) : fallback;
}

function normalizeBatchSize(raw: number | string | undefined, fallback: number): number {
  const parsedBatchSize = Number(raw);
  return Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : fallback;
}

function normalizeBatchConcurrency(raw: number | string | undefined, fallback: number): number {
  const parsedConcurrency = Number(raw);
  if (!Number.isFinite(parsedConcurrency) || parsedConcurrency < 1) return fallback;
  return Math.min(10, Math.floor(parsedConcurrency));
}

function normalizeTimeBudget(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return Number.POSITIVE_INFINITY;
  if (raw <= 0) return 0;
  return Math.floor(raw);
}

export async function classifyReviewsWithOpenAI(args: {
  texts: string[];
  fallbackClassifications?: LlmClassification[];
  model?: string;
  timeBudgetMs?: number;
  maxConcurrency?: number;
}): Promise<LlmClassificationResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[LLM:classify][OPENAI_KEY_MISSING] OPENAI_API_KEY 미설정 — LLM 분류 건너뜀");
    return null;
  }

  const model = args.model ?? env.openai.model;
  const batchSize = normalizeBatchSize(
    process.env.OPENAI_CLASSIFY_BATCH_SIZE,
    Math.max(1, env.openai.classifyBatchSize || DEFAULT_CLASSIFY_BATCH_SIZE)
  );
  const timeoutMs = normalizeTimeout(
    process.env.OPENAI_CLASSIFY_TIMEOUT_MS ?? env.openai.classifyTimeoutMs ?? DEFAULT_CLASSIFY_TIMEOUT_MS,
    DEFAULT_CLASSIFY_TIMEOUT_MS
  );
  const totalTimeBudgetMs = normalizeTimeBudget(args.timeBudgetMs);
  const maxConcurrency = normalizeBatchConcurrency(
    args.maxConcurrency === undefined ? env.openai.classifyMaxConcurrency ?? DEFAULT_CLASSIFY_MAX_CONCURRENCY : args.maxConcurrency,
    DEFAULT_CLASSIFY_MAX_CONCURRENCY
  );
  const client = new OpenAI({ apiKey, maxRetries: 0 });

  console.log(`[LLM:classify][BATCH_START] model=${model}, texts=${args.texts.length}건, batchSize=${batchSize}`);
  if (args.texts.length === 0) {
    console.log("[LLM:classify][OPENAI_CLASSIFY_EMPTY] 분류 대상 없음");
    return {
      classifications: [],
      appliedCount: 0,
      requestedCount: 0,
      failedBatchCount: 0
    };
  }

  if (totalTimeBudgetMs < timeoutMs + CLASSIFY_TIMEOUT_GUARD_MS) {
    console.warn(
      `[LLM:classify][OPENAI_CLASSIFY_SKIPPED] timeBudgetMs=${totalTimeBudgetMs}ms < required=${timeoutMs + CLASSIFY_TIMEOUT_GUARD_MS}ms`
    );
    return null;
  }

  const out: LlmClassification[] = [];
  const startAtMs = Date.now();
  const output: Array<LlmClassification | undefined> = new Array(args.texts.length);
  const batchOffsets: Array<number> = [];
  for (let i = 0; i < args.texts.length; i += batchSize) batchOffsets.push(i);
  const fallbackClassifications = args.fallbackClassifications ?? [];
  const fallbackForIndex = (index: number): LlmClassification => fallbackClassifications[index] ?? { sentiment: "neutral", category: "기타" };
  let appliedCount = 0;
  let failedBatchCount = 0;

  const fillFallbackBatch = (offset: number, batchLength: number) => {
    for (let j = 0; j < batchLength; j++) {
      const id = offset + j;
      output[id] = fallbackForIndex(id);
    }
  };

  const runBatch = async (offset: number): Promise<void> => {
    const budgetLeftMs = totalTimeBudgetMs === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : totalTimeBudgetMs - (Date.now() - startAtMs);
    if (budgetLeftMs !== Number.POSITIVE_INFINITY && budgetLeftMs < timeoutMs + CLASSIFY_TIMEOUT_GUARD_MS) {
      console.error(`[LLM:classify][OPENAI_BATCH_TIMEOUT_RISK] batchOffset=${offset}, remaining=${budgetLeftMs}ms`);
      const batch = args.texts.slice(offset, offset + batchSize);
      failedBatchCount++;
      fillFallbackBatch(offset, batch.length);
      return;
    }

    const batch = args.texts.slice(offset, offset + batchSize);
    const payload = batch.map((t, idx) => ({ id: offset + idx, text: t.slice(0, 600) }));
    let resp: Awaited<ReturnType<typeof client.chat.completions.create>>;

    try {
      resp = await client.chat.completions.create(
        {
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                `너는 이커머스 리뷰 분석기다.`,
                `입력 배열 items의 각 원소에 대해 sentiment/category를 분류하라.`,
                `sentiment는 positive|neutral|negative 중 하나.`,
                `category는 배송|품질|가격|사용성|CS|기타 중 하나.`,
                `출력은 반드시 JSON만: { "items": [{ "id": number, "sentiment": "...", "category": "..." }, ...] }`,
                ``,
                JSON.stringify({ items: payload })
              ].join("\n")
            }
          ]
        },
        { timeout: timeoutMs }
      );
    } catch (err) {
      console.error(`[LLM:classify][OPENAI_BATCH_CALL_FAILED] batchOffset=${offset}, error=${err instanceof Error ? err.message : String(err)}`);
      failedBatchCount++;
      fillFallbackBatch(offset, batch.length);
      return;
    }

    const text = resp.choices?.[0]?.message?.content ?? "";
    const parsedItems = parseOpenAiResponse(text);
    if (!parsedItems) {
      console.error(`[LLM:classify][OPENAI_RESPONSE_PARSE_FAILED] batchOffset=${offset}, response=${text.slice(0, 200)}`);
      failedBatchCount++;
      fillFallbackBatch(offset, batch.length);
      return;
    }

    const map = toMapById(parsedItems);
    if (map.size === 0) {
      const keys =
        parsedItems.length > 0 && parsedItems[0] && typeof parsedItems[0] === "object"
          ? Object.keys(parsedItems[0] as Record<string, unknown>).join(",")
          : "(empty)";
      console.error(`[LLM:classify][OPENAI_ITEMS_MISSING] batchOffset=${offset}, keys=${keys}`);
      failedBatchCount++;
      fillFallbackBatch(offset, batch.length);
      return;
    }

    let batchApplied = 0;
    for (let j = 0; j < batch.length; j++) {
      const id = offset + j;
      // Prefer the global id we asked for; tolerate models that renumber ids
      // per-batch (0-based) by falling back to the within-batch index.
      const item = map.get(id) ?? map.get(j);
      if (item) {
        output[id] = item;
        appliedCount++;
        batchApplied++;
      } else {
        output[id] = fallbackForIndex(id);
      }
    }

    // A batch where nothing matched is a real failure, not a silent heuristic
    // fallback — surface it so callers don't report degraded output as AI-classified.
    if (batchApplied === 0) {
      console.error(`[LLM:classify][OPENAI_BATCH_UNMATCHED] batchOffset=${offset}, size=${batch.length}`);
      failedBatchCount++;
    }
  };

  for (let i = 0; i < batchOffsets.length; i += maxConcurrency) {
    const slice = batchOffsets.slice(i, i + maxConcurrency);
    await Promise.all(slice.map((offset) => runBatch(offset)));
  }

  for (let i = 0; i < args.texts.length; i++) {
    out.push(output[i] ?? fallbackForIndex(i));
  }

  console.log(`[LLM:classify][OPENAI_CLASSIFY_OK] 총 ${out.length}건 분류 완료`);
  return {
    classifications: out,
    appliedCount,
    requestedCount: args.texts.length,
    failedBatchCount
  };
}
