import { describe, expect, it } from "vitest";
import { renderReportHtml } from "./report_html";

const baseStats = {
  total: 42,
  positive: 30,
  negative: 8,
  neutral: 4,
  positiveRatio: 0.714,
  negativeRatio: 0.19,
  avgRating: 4.3,
  negativeKeywordsTop10: [
    { keyword: "불편", count: 12 },
    { keyword: "배송 느림", count: 5 }
  ],
  categoryCounts: {
    품질: 6,
    배송: 4,
    가격: 3
  },
  priorityScore: 72.5,
  recentness: {
    hasDates: true,
    last30Share: 0.42,
    last90Share: 0.61,
    last30NegativeRatio: 0.21
  }
};

const baseSuggestions = {
  detailPageCopy: ["상세페이지 상단에 가격 할인 표기 변경을 제안합니다."],
  csResponseTemplates: ["안녕하세요, 교환 절차를 안내드리겠습니다."],
  faqRecommendations: ["배송 지연은 언제까지인가요?"],
  notes: ["최종 점검 필요", "메시지 스타일을 통일하세요."]
};

describe("renderReportHtml", () => {
  it("contains dashboard style sections", () => {
    const html = renderReportHtml({
      title: "리뷰 요약 분석",
      stats: baseStats,
      suggestions: baseSuggestions,
      meta: { filename: "sample.csv", createdAt: "2026-01-01T00:00:00.000Z" }
    });

    expect(html).toContain("ReviewBoost Report");
    expect(html).toContain("리뷰 수");
    expect(html).toContain("평균 별점");
    expect(html).toContain("부정 비율");
    expect(html).toContain("우선순위 점수");
    expect(html).toContain("지표 요약");
    expect(html).toContain("부정 키워드 Top 10");
    expect(html).toContain("문제 카테고리");
    expect(html).toContain("개선 제안(상세페이지)");
    expect(html).toContain("개선 제안(CS 응대)");
    expect(html).toContain("개선 제안(FAQ)");
    expect(html).toContain("Notes");
  });

  it("escapes untrusted strings in title and list text", () => {
    const html = renderReportHtml({
      title: `<script>alert("x")</script>`,
      stats: {
        ...baseStats,
        negativeKeywordsTop10: [{ keyword: "핵심 & 핵심", count: 1 }, { keyword: "<bad>", count: 2 }],
        categoryCounts: { "<cat>": 1 }
      },
      suggestions: {
        detailPageCopy: ["안전 <tag>"],
        csResponseTemplates: ['response "quote"'],
        faqRecommendations: ["faq & support"],
        notes: ["note <value>"]
      },
      meta: { filename: "x&y.csv", createdAt: "2026-01-01T00:00:00.000Z" }
    });

    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("핵심 &amp; 핵심");
    expect(html).toContain("&lt;bad&gt;");
    expect(html).toContain("x&amp;y.csv");
    expect(html).toContain("&lt;cat&gt;");
    expect(html).toContain("안전 &lt;tag&gt;");
  });
});
