import React from "react";
import type { AnalysisOutput } from "@/lib/types";
import AnalysisKpiGrid from "./AnalysisKpiGrid";
import { AnalysisListSection, type AnalysisListSectionItem } from "./AnalysisListSection";

export type AnalysisResultDigestItemSets = ReturnType<typeof getAnalysisResultDigestItems>;

export function getAnalysisResultDigestItems(result: Pick<AnalysisOutput, "stats" | "suggestions">) {
  const negativeKeywords = (result.stats.negativeKeywordsTop10 ?? []).map((k, idx) => ({
    id: `keyword-${k.keyword}-${idx}`,
    label: <strong>{k.keyword}</strong>,
    right: k.count,
    copyText: k.keyword
  })) as AnalysisListSectionItem[];

  const categoryEntries = Object.entries(result.stats.categoryCounts ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count], idx) => ({
      id: `category-${cat}-${idx}`,
      label: cat,
      right: String(count)
    }));

  const detailPageCopy = (result.suggestions?.detailPageCopy ?? []).map((suggestion, idx) => ({
    id: `detail-${idx}`,
    label: suggestion,
    right: "",
    copyText: suggestion
  }));

  const csAndFaq = (result.suggestions?.csResponseTemplates ?? [])
    .map((suggestion, idx) => ({ id: `cs-${idx}`, label: suggestion, right: "", copyText: suggestion }))
    .concat(
      (result.suggestions?.faqRecommendations ?? []).map((suggestion, idx) => ({
        id: `faq-${idx}`,
        label: suggestion,
        right: "",
        copyText: suggestion
      }))
    );

  const notes = (result.suggestions?.notes ?? []).map((note, idx) => ({
    id: `note-${idx}`,
    label: <span className="analysisResultDigestNote">{note}</span>,
    right: "",
    copyText: note
  }));

  return {
    negativeKeywords,
    categoryEntries,
    detailPageCopy,
    csAndFaq,
    notes
  };
}

export default function AnalysisResultDigest({ result }: { result: Pick<AnalysisOutput, "stats" | "suggestions"> }) {
  const items = getAnalysisResultDigestItems(result);

  return (
    <div className="analysisResultDigest" id="digest-section" aria-label="분석 요약">
      <div className="analysisDigestHeader">
        <div>
          <p className="sectionEyebrow">Digest</p>
          <h2>핵심 지표와 바로 사용할 수 있는 제안을 한 번에 확인합니다.</h2>
        </div>
      </div>

      <AnalysisKpiGrid stats={result.stats} includeRecentness={Boolean(result.stats.recentness?.hasDates)} />
      <p className="hint analysisDigestHint">
        우선순위 점수는 &ldquo;지금 먼저 개선할 가치&rdquo;를 0~100으로 요약한 값입니다. 부정 비율, 최근성, 리뷰 수, 영향도가 높을수록 점수가
        올라갑니다.
      </p>

      <div className="grid digestGrid digestGridSingleColumn">
        <AnalysisListSection title="부정 키워드 TOP10" items={items.negativeKeywords} emptyMessage="부정 키워드를 찾지 못했습니다." />
        <AnalysisListSection title="문제 카테고리" items={items.categoryEntries} emptyMessage="카테고리가 없습니다." />
      </div>

      <div className="grid digestGrid digestGridSingleColumn">
        <AnalysisListSection title="개선 제안: 상세페이지 문구" items={items.detailPageCopy} emptyMessage="개선 제안이 없습니다." />
        <AnalysisListSection title="개선 제안: CS/FAQ" items={items.csAndFaq} emptyMessage="개선 제안이 없습니다." />
      </div>

      {items.notes.length > 0 ? (
        <div className="grid digestGrid digestGridSingleColumn">
          <AnalysisListSection title="메모" items={items.notes} emptyMessage="메모가 없습니다." />
        </div>
      ) : null}
    </div>
  );
}
