import OpenAI from "openai";
import type { Category, Sentiment } from "@/lib/types";

export type LlmClassification = { sentiment: Sentiment; category: Category };

const VALID_SENTIMENT: Sentiment[] = ["positive", "neutral", "negative"];
const VALID_CATEGORY: Category[] = ["배송", "품질", "가격", "사용성", "CS", "기타"];

function coerceSentiment(v: any): Sentiment {
  if (VALID_SENTIMENT.includes(v)) return v;
  return "neutral";
}

function coerceCategory(v: any): Category {
  if (VALID_CATEGORY.includes(v)) return v;
  return "기타";
}

export async function classifyReviewsWithOpenAI(args: {
  texts: string[];
  model?: string;
}): Promise<LlmClassification[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[LLM:classify][OPENAI_KEY_MISSING] OPENAI_API_KEY 미설정 — LLM 분류 건너뜀");
    return null;
  }

  const model = args.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const parsedBatchSize = Number(process.env.OPENAI_CLASSIFY_BATCH_SIZE ?? "60");
  const batchSize = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 60;
  console.log(`[LLM:classify][BATCH_START] model=${model}, texts=${args.texts.length}건, batchSize=${batchSize}`);
  const client = new OpenAI({ apiKey });

  const out: LlmClassification[] = [];
  const parsedTimeoutMs = Number(process.env.OPENAI_CLASSIFY_TIMEOUT_MS ?? "8000");
  const timeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs >= 3000 ? Math.floor(parsedTimeoutMs) : 8000;

  for (let i = 0; i < args.texts.length; i += batchSize) {
    const batch = args.texts.slice(i, i + batchSize);
    const payload = batch.map((t, idx) => ({ id: i + idx, text: t.slice(0, 600) }));

    let resp;
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
      console.error(`[LLM:classify][OPENAI_BATCH_CALL_FAILED] batchOffset=${i}, error=${err instanceof Error ? err.message : String(err)}`);
      return null;
    }

    const text = resp.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error(`[LLM:classify][OPENAI_RESPONSE_PARSE_FAILED] batchOffset=${i}, response=${text.slice(0, 200)}`);
      return null;
    }

    const items = Array.isArray(parsed?.items) ? parsed.items : null;
    if (!items) {
      console.error(`[LLM:classify][OPENAI_ITEMS_MISSING] batchOffset=${i}, keys=${Object.keys(parsed ?? {}).join(",")}`);
      return null;
    }

    // map by id
    const map = new Map<number, LlmClassification>();
    for (const it of items) {
      const id = Number(it?.id);
      if (!Number.isFinite(id)) continue;
      map.set(id, { sentiment: coerceSentiment(it?.sentiment), category: coerceCategory(it?.category) });
    }

    for (let j = 0; j < batch.length; j++) {
      const id = i + j;
      out.push(map.get(id) ?? { sentiment: "neutral", category: "기타" });
    }
  }

  console.log(`[LLM:classify][OPENAI_CLASSIFY_OK] 총 ${out.length}건 분류 완료`);
  return out;
}
