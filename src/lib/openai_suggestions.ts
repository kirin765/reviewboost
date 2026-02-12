import OpenAI from "openai";
import type { AnalysisStats, Suggestions } from "@/lib/types";

function fallbackSuggestions(
  stats: AnalysisStats,
  opts?: { modeLabel?: "heuristic" | "llm_fallback"; llmTargetCount?: number; totalCount?: number }
): Suggestions {
  const topCats = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const topKw = stats.negativeKeywordsTop10.slice(0, 5).map((k) => k.keyword);

  const detailPageCopy = [
    `구매 전 꼭 확인해주세요: 배송/구성/사용법을 상세히 안내드립니다. (최근 이슈: ${topCats.map((c) => c[0]).join(", ")})`,
    `품질 관련 안내: 제품 검수 및 포장 과정을 강화하고 있으며, 이상 발생 시 교환/환불을 빠르게 도와드립니다.`,
    `사이즈/스펙 안내: 사이즈는 상세 이미지의 실측 기준이며, 측정 위치에 따라 ±오차가 있을 수 있습니다.`
  ];

  const csResponseTemplates = [
    `불편을 드려 죄송합니다. 현재 상황을 확인하기 위해 주문번호와 문제 사진(가능 시)을 보내주시면 즉시 교환/환불 절차를 안내드리겠습니다.`,
    `배송 지연으로 불편을 드려 죄송합니다. 현재 택배사 이동 경로를 확인 중이며, 오늘 중으로 정확한 도착 예정일을 안내드리겠습니다.`
  ];

  const faqRecommendations = [
    `FAQ: 교환/반품 기준과 처리 기간은 어떻게 되나요?`,
    `FAQ: 배송 기간(주문 후 평균 소요일)은 어떻게 되나요?`,
    `FAQ: 구성품 누락/파손 시 어떻게 처리하나요?`
  ];

  const notes = [];
  if (opts?.modeLabel === "heuristic") {
    notes.push("일반 분석 모드: 규칙 기반 템플릿 제안입니다. AI 고급 분석을 켜면 문구 다양성과 맥락 반영이 강화됩니다.");
  } else if (opts?.modeLabel === "llm_fallback") {
    notes.push("AI 고급 분석 요청이 지연/실패되어 템플릿 제안으로 자동 전환되었습니다.");
  } else {
    notes.push(`AI 연결 없이 기본 문구 템플릿으로 만들었습니다. (설정되어 있으면 더 다양한 문구를 생성할 수 있어요.)`);
  }
  if (typeof opts?.llmTargetCount === "number" && typeof opts?.totalCount === "number" && opts.totalCount > opts.llmTargetCount) {
    notes.push(`대용량 안정화를 위해 ${opts.totalCount}개 중 ${opts.llmTargetCount}개 리뷰만 AI 대상으로 처리했습니다.`);
  }
  notes.push(topKw.length ? `자주 언급된 부정 키워드: ${topKw.join(", ")}` : `부정 키워드가 충분히 추출되지 않았습니다.`);

  return { detailPageCopy, csResponseTemplates, faqRecommendations, notes };
}

export async function generateSuggestions(
  stats: AnalysisStats,
  opts?: { useAiNarrative?: boolean; llmTargetCount?: number; totalCount?: number }
): Promise<Suggestions> {
  if (!opts?.useAiNarrative) return fallbackSuggestions(stats, { modeLabel: "heuristic" });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) return fallbackSuggestions(stats, { modeLabel: "llm_fallback", llmTargetCount: opts?.llmTargetCount, totalCount: opts?.totalCount });

  const client = new OpenAI({ apiKey });
  const prompt = {
    role: "user" as const,
    content: [
      `너는 스마트스토어/쿠팡 판매자용 "리뷰 기반 매출 개선 컨설턴트"다.`,
      `아래 통계 기반으로 (1) 상세페이지 수정 문구 6개, (2) CS 응대 문구 4개, (3) FAQ 6개를 한국어로 만들어라.`,
      `조건: 과장 금지, 구체적으로, 고객 신뢰를 높이는 톤, 문구는 바로 복붙 가능해야 함.`,
      `출력은 반드시 JSON만: { "detailPageCopy": string[], "csResponseTemplates": string[], "faqRecommendations": string[], "notes": string[] }`,
      ``,
      `통계:`,
      JSON.stringify(stats, null, 2)
    ].join("\n")
  };

  const parsedTimeoutMs = Number(process.env.OPENAI_SUGGEST_TIMEOUT_MS ?? "6000");
  const timeoutMs = Number.isFinite(parsedTimeoutMs) && parsedTimeoutMs >= 3000 ? Math.floor(parsedTimeoutMs) : 6000;

  let resp;
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
  } catch {
    return fallbackSuggestions(stats, { modeLabel: "llm_fallback", llmTargetCount: opts?.llmTargetCount, totalCount: opts?.totalCount });
  }

  const text = resp.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text) as Suggestions;
    if (!parsed.detailPageCopy || !parsed.csResponseTemplates || !parsed.faqRecommendations || !parsed.notes) {
      return fallbackSuggestions(stats, { modeLabel: "llm_fallback", llmTargetCount: opts?.llmTargetCount, totalCount: opts?.totalCount });
    }
    return parsed;
  } catch {
    return fallbackSuggestions(stats, { modeLabel: "llm_fallback", llmTargetCount: opts?.llmTargetCount, totalCount: opts?.totalCount });
  }
}
