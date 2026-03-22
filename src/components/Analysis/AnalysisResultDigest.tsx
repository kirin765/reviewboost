"use client";

import React from "react";
import type { AnalysisOutput } from "@/lib/types";
import AnalysisKpiGrid from "./AnalysisKpiGrid";
import { AnalysisListSection, type AnalysisListSectionItem } from "./AnalysisListSection";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

  return (
    <div className="analysisResultDigest" id="digest-section" aria-label={t("digest.summary")}>
      <div className="analysisDigestHeader">
        <div>
          <p className="sectionEyebrow">{t("digest.eyebrow")}</p>
          <h2>{t("digest.title")}</h2>
        </div>
      </div>

      <AnalysisKpiGrid stats={result.stats} includeRecentness={Boolean(result.stats.recentness?.hasDates)} />
      <p className="hint analysisDigestHint">{t("digest.priorityHint")}</p>

      <div className="grid digestGrid digestGridSingleColumn">
        <AnalysisListSection title={t("digest.negKeywordsTop10")} items={items.negativeKeywords} emptyMessage={t("digest.noNegKeywords")} />
        <AnalysisListSection title={t("digest.problemCategories")} items={items.categoryEntries} emptyMessage={t("digest.noCategories")} />
      </div>

      <div className="grid digestGrid digestGridSingleColumn">
        <AnalysisListSection title={t("digest.detailPageCopy")} items={items.detailPageCopy} emptyMessage={t("digest.noSuggestions")} />
        <AnalysisListSection title={t("digest.csFaq")} items={items.csAndFaq} emptyMessage={t("digest.noSuggestions")} />
      </div>

      {items.notes.length > 0 ? (
        <div className="grid digestGrid digestGridSingleColumn">
          <AnalysisListSection title={t("digest.notes")} items={items.notes} emptyMessage={t("digest.noNotes")} />
        </div>
      ) : null}
    </div>
  );
}
