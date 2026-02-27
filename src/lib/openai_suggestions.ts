import OpenAI from "openai";
import type { AnalysisStats, Suggestions } from "@/lib/types";

type SuggestionOptions = {
  useAiNarrative?: boolean;
  negativeReviewSamples?: Array<{ text: string; category: string }>;
  topKeywords?: Array<{ keyword: string; count: number }>;
  totalCount?: number;
};

type SuggestionRaw = {
  detailPageCopy?: unknown;
  csResponseTemplates?: unknown;
  faqRecommendations?: unknown;
  notes?: unknown;
};

const CATEGORY_SUGGESTIONS: Record<string, { detail: string; cs: string; faq: string }> = {
  "배송": {
    detail: "배송 안내: 주문 후 평균 발송일, 택배사, 추적 방법을 상세페이지에 명시하고 있습니다.",
    cs: "배송 관련 불편을 드려 죄송합니다. 현재 송장번호 기준 택배사 이동 경로를 확인 중이며, 정확한 도착 예정일을 안내드리겠습니다.",
    faq: "FAQ: 배송은 보통 얼마나 걸리나요? (주문 후 평균 소요일 안내)"
  },
  "품질": {
    detail: "품질 관리 안내: 출고 전 전수검사를 진행하며, 이상 발생 시 교환/환불을 빠르게 도와드립니다.",
    cs: "제품 품질에 불편을 드려 죄송합니다. 주문번호와 문제 사진을 보내주시면 즉시 교환/환불 절차를 안내드리겠습니다.",
    faq: "FAQ: 제품에 불량이 있으면 어떻게 하나요? (교환/반품 기준과 처리 기간)"
  },
  "사용성": {
    detail: "사용법 안내: 처음 사용 시 참고할 수 있는 가이드를 상세페이지 하단에 안내드립니다.",
    cs: "사용 중 불편을 드려 죄송합니다. 구체적인 증상을 알려주시면 사용법 가이드 또는 교환 절차를 안내드리겠습니다.",
    faq: "FAQ: 사용법이나 조립 방법을 자세히 알 수 있나요?"
  },
  "가격": {
    detail: "가격/구성 안내: 제품 구성 내역과 포함 항목을 상세히 기재하고 있으니 구매 전 확인 부탁드립니다.",
    cs: "가격 대비 만족도가 낮으셨군요. 현재 구성 내역을 안내드리며, 추가 혜택이 있으면 함께 알려드리겠습니다.",
    faq: "FAQ: 세트 구성에 포함된 항목이 정확히 무엇인가요?"
  },
  "CS": {
    detail: "고객지원 안내: 문의 시 평균 응답 시간, 운영 시간, 연락처를 상세페이지에 명시합니다.",
    cs: "응대가 늦어 죄송합니다. 현재 문의량이 많아 순차 처리 중이며, 가능한 빨리 답변드리겠습니다.",
    faq: "FAQ: 고객센터 운영 시간과 연락 방법은?"
  }
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isSuggestions(value: unknown): value is Suggestions {
  if (!value || typeof value !== "object") return false;
  const candidate = value as SuggestionRaw;
  return (
    isStringArray(candidate.detailPageCopy) &&
    isStringArray(candidate.csResponseTemplates) &&
    isStringArray(candidate.faqRecommendations) &&
    isStringArray(candidate.notes)
  );
}

function fallbackSuggestions(stats: AnalysisStats, opts?: SuggestionOptions): Suggestions {
  const sortedCats = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
  const topKw = (opts?.topKeywords ?? stats.negativeKeywordsTop10).slice(0, 5);
  const total = opts?.totalCount ?? stats.total;
  const negCount = stats.negative;
  const negPct = total > 0 ? Math.round((negCount / total) * 100) : 0;

  const detailPageCopy: string[] = [];
  const csResponseTemplates: string[] = [];
  const faqRecommendations: string[] = [];

  for (const [cat, count] of sortedCats) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const tmpl = CATEGORY_SUGGESTIONS[cat];
    if (tmpl) {
      detailPageCopy.push(`${tmpl.detail} (관련 리뷰 ${count}건, ${pct}%)`);
      csResponseTemplates.push(tmpl.cs);
      faqRecommendations.push(tmpl.faq);
    }
  }

  while (detailPageCopy.length < 3) {
    detailPageCopy.push("구매 전 꼭 확인해주세요: 상세페이지의 사이즈/스펙/구성 안내를 참고해주세요.");
  }
  while (csResponseTemplates.length < 2) {
    csResponseTemplates.push("불편을 드려 죄송합니다. 주문번호를 알려주시면 빠르게 확인 후 안내드리겠습니다.");
  }
  while (faqRecommendations.length < 3) {
    faqRecommendations.push("FAQ: 구성품 누락/파손 시 어떻게 처리하나요?");
  }

  const notes: string[] = [];
  if (topKw.length) {
    notes.push(`자주 언급된 부정 키워드: ${topKw.map((k) => `${k.keyword}(${k.count}건)`).join(", ")}`);
  } else {
    notes.push("부정 키워드가 충분히 추출되지 않았습니다.");
  }
  if (negCount > 0) {
    notes.push(`부정 리뷰 ${negCount}건(${negPct}%) 중 주요 카테고리: ${sortedCats
      .slice(0, 3)
      .map(([c, n]) => `${c}(${n}건)`)
      .join(", ")}`);
  }

  return { detailPageCopy, csResponseTemplates, faqRecommendations, notes };
}

export async function generateSuggestions(stats: AnalysisStats, opts?: SuggestionOptions): Promise<Suggestions> {
  if (!opts?.useAiNarrative) {
    console.log("[LLM:suggest][SUGGEST_DECISION_OFF_NOT_USABLE] AI 제안 미사용 — 템플릿 폴백");
    return fallbackSuggestions(stats, opts);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    console.warn("[LLM:suggest][SUGGEST_KEY_MISSING] OPENAI_API_KEY 미설정 — 템플릿 폴백");
    return fallbackSuggestions(stats, opts);
  }

  console.log(`[LLM:suggest] 시작 — model=${model}, total=${opts?.totalCount ?? stats.total}건`);

  const total = opts?.totalCount ?? stats.total;
  const negCount = stats.negative;
  const negPct = total > 0 ? Math.round((negCount / total) * 100) : 0;
  const avgRating = stats.avgRating !== null ? stats.avgRating.toFixed(2) : "N/A";

  const catBreakdown = Object.entries(stats.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `  - ${cat}: ${count}건 (${total > 0 ? Math.round((count / total) * 100) : 0}%)`)
    .join("\n");

  const kwList = (opts?.topKeywords ?? stats.negativeKeywordsTop10)
    .slice(0, 10)
    .map((k) => `  - ${k.keyword}: ${k.count}건`)
    .join("\n");

  const samples = (opts?.negativeReviewSamples ?? []).slice(0, 5);
  const sampleText = samples.length > 0
    ? samples.map((s, i) => `  ${i + 1}. [${s.category}] "${s.text}"`).join("\n")
    : "  (샘플 없음)";

  const client = new OpenAI({ apiKey });
  const prompt = {
    role: "user" as const,
    content: [
      `너는 스마트스토어/쿠팡 판매자용 "리뷰 기반 매출 개선 컨설턴트"다.`,
      ``,
      `## 분석 요약`,
      `- 전체 리뷰: ${total}건`,
      `- 부정 리뷰: ${negCount}건 (${negPct}%)`,
      `- 평균 별점: ${avgRating}`,
      ``,
      `## 카테고리별 분포`,
      catBreakdown,
      ``,
      `## 부정 키워드 TOP 10`,
      kwList || "  (추출된 키워드 없음)",
      ``,
      `## 부정 리뷰 샘플 (최대 5건)`,
      sampleText,
      ``,
      `## 요청`,
      `위 데이터를 근거로 (1) 상세페이지 수정 문구 6개, (2) CS 응대 문구 4개, (3) FAQ 6개를 한국어로 만들어라.`,
      `조건:`,
      `- 과장 금지, 구체적으로, 고객 신뢰를 높이는 톤, 문구는 바로 복붙 가능해야 함`,
      `- 모든 제안에 근거 데이터(건수/비율)를 포함할 것`,
      `- notes에는 분석 방식 언급 금지, 핵심 인사이트와 우선순위만 기재`,
      ``,
      `출력은 반드시 JSON만: { "detailPageCopy": string[], "csResponseTemplates": string[], "faqRecommendations": string[], "notes": string[] }`
    ].join("\n")
  };

  const parsedTimeoutMs = Number(process.env.OPENAI_SUGGEST_TIMEOUT_MS ?? "6000");
  const timeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs >= 3000 ? Math.floor(parsedTimeoutMs) : 6000;

  let resp: Awaited<ReturnType<typeof client.chat.completions.create>>;
  try {
    resp = await client.chat.completions.create(
      {
        model,
        messages: [prompt],
        temperature: 0.4,
        response_format: { type: "json_object" }
      },
      { timeout: timeoutMs }
    );
  } catch (err) {
    console.error(`[LLM:suggest][SUGGEST_API_FAILED] error=${err instanceof Error ? err.message : String(err)} → 템플릿 폴백`);
    return fallbackSuggestions(stats, opts);
  }

  const text = resp.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text) as SuggestionRaw;
    if (!isSuggestions(parsed)) {
      console.error(`[LLM:suggest][SUGGEST_FIELDS_MISSING] keys=${Object.keys(parsed ?? {}).join(",")} → 템플릿 폴백`);
      return fallbackSuggestions(stats, opts);
    }
    console.log(`[LLM:suggest][SUGGEST_OK] detail=${parsed.detailPageCopy.length}건, cs=${parsed.csResponseTemplates.length}건, faq=${parsed.faqRecommendations.length}건`);
    return parsed;
  } catch (err) {
    console.error(`[LLM:suggest][SUGGEST_PARSE_INVALID] response=${text.slice(0, 200)} → 템플릿 폴백`);
    return fallbackSuggestions(stats, opts);
  }
}
