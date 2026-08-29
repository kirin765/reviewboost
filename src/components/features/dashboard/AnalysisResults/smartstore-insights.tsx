"use client";

import React from "react";
import type { SmartstoreInsights } from "@/lib/types";
import { Surface } from "@/components/ui/Primitives";

/**
 * 스마트스토어 공식 리뷰 엑셀 폼 분석 전용 "검수 + 리서치" 섹션.
 * 결과 payload의 smartstore 필드가 있을 때만 렌더링된다.
 */

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function ratingLabel(rating: number | null): string {
  return rating === null ? "별점 미기재" : `${rating}점`;
}

function ScreeningList({
  items,
  emptyLabel
}: {
  items: SmartstoreInsights["unrepliedNegative"];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--rb-muted)]">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={`${item.review.text.slice(0, 24)}-${index}`}
          className="rounded-[14px] border border-[color:rgba(255,138,138,0.18)] bg-[rgba(255,138,138,0.06)] p-4"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--rb-muted)]">
            <span className="rounded-full border border-[color:rgba(255,138,138,0.2)] bg-[rgba(255,138,138,0.1)] px-2 py-0.5 text-[#ff9c9c]">
              {ratingLabel(item.review.rating)}
            </span>
            {item.productName ? <span>{item.productName}</span> : null}
            <span>{item.review.category}</span>
          </div>
          <p className="mt-2 text-sm leading-7 text-[var(--rb-fg)]">{item.review.text.slice(0, 200)}</p>
        </li>
      ))}
    </ul>
  );
}

export default function SmartstoreInsightsSection({ insights }: { insights: SmartstoreInsights }) {
  const productRows = insights.productStats.slice(0, 10);

  return (
    <Surface className="px-6 py-6 md:px-7">
      <div className="h-1.5 w-14 rounded-full bg-[#1d8a4b]" aria-hidden="true" />
      <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">스마트스토어 검수 · 리서치</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">폼 필드를 활용한 선별과 인사이트</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--rb-muted-strong)]">
        답글 여부·포토/영상·베스트리뷰·도움수·상품명 열을 읽어 문제 리뷰를 선별(검수)하고 운영 인사이트(리서치)를 정리했습니다.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">검수</p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">지금 챙겨야 할 문제 리뷰</h3>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-[var(--rb-fg)]">답글 없는 부정 리뷰</strong>
              <span className="rounded-full border border-[color:rgba(255,138,138,0.2)] bg-[rgba(255,138,138,0.08)] px-2.5 py-0.5 text-xs font-medium text-[#d95c5c]">
                {insights.unrepliedNegativeCount}건
              </span>
            </div>
            <div className="mt-3">
              <ScreeningList items={insights.unrepliedNegative} emptyLabel="답글 없는 부정 리뷰가 없습니다." />
            </div>
          </div>

          <div className="mt-5 pt-5">
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-[var(--rb-fg)]">사진이 붙은 부정 리뷰</strong>
              <span className="rounded-full border border-[color:rgba(255,138,138,0.2)] bg-[rgba(255,138,138,0.08)] px-2.5 py-0.5 text-xs font-medium text-[#d95c5c]">
                {insights.negativeWithPhotoCount}건
              </span>
            </div>
            <p className="mt-1 text-xs leading-6 text-[var(--rb-muted)]">사진이 노출된 부정 리뷰는 구매 전환에 미치는 영향이 큽니다.</p>
            <div className="mt-3">
              <ScreeningList items={insights.negativeWithPhoto} emptyLabel="사진이 붙은 부정 리뷰가 없습니다." />
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">리서치</p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">폼 필드로 보는 리뷰 운영</h3>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:rgba(46,160,90,0.3)] bg-[rgba(46,160,90,0.07)] px-3 py-1 text-xs text-[#1d8a4b]">
              사진 리뷰 {insights.photoReviewCount}건 ({pct(insights.photoReviewRatio)})
            </span>
            <span className="rounded-full border border-[color:rgba(46,160,90,0.3)] bg-[rgba(46,160,90,0.07)] px-3 py-1 text-xs text-[#1d8a4b]">
              베스트리뷰 {insights.bestReviewCount}건
            </span>
            <span className="rounded-full border border-[color:rgba(46,160,90,0.3)] bg-[rgba(46,160,90,0.07)] px-3 py-1 text-xs text-[#1d8a4b]">
              도움수 합계 {insights.totalHelpful}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-[var(--rb-fg)]">상품별 리뷰 분포</p>
            <div className="mt-3 overflow-hidden rounded-[14px] border border-[color:#e6e8f2]">
              <table className="w-full text-left text-sm text-[var(--rb-fg)]">
                <thead className="bg-[#f4f5fb]">
                  <tr>
                    <th className="border-b border-[color:#e6e8f2] px-3 py-2.5 font-semibold">상품</th>
                    <th className="border-b border-[color:#e6e8f2] px-3 py-2.5 text-right font-semibold">리뷰</th>
                    <th className="border-b border-[color:#e6e8f2] px-3 py-2.5 text-right font-semibold">평균 별점</th>
                    <th className="border-b border-[color:#e6e8f2] px-3 py-2.5 text-right font-semibold">부정 비율</th>
                    <th className="border-b border-[color:#e6e8f2] px-3 py-2.5 text-right font-semibold">사진 비율</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-[var(--rb-muted)]">
                        상품명 열이 없어 상품별 분포를 계산할 수 없습니다.
                      </td>
                    </tr>
                  ) : (
                    productRows.map((row) => (
                      <tr key={row.productName} className="border-b border-[color:#e6e8f2] last:border-b-0">
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-[var(--rb-fg)]" title={row.productName}>
                          {row.productName}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--rb-muted-strong)]">{row.reviewCount}건</td>
                        <td className="px-3 py-2.5 text-right text-[var(--rb-muted-strong)]">
                          {row.avgRating === null ? "-" : row.avgRating.toFixed(1)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--rb-muted-strong)]">{pct(row.negativeRatio)}</td>
                        <td className="px-3 py-2.5 text-right text-[var(--rb-muted-strong)]">{pct(row.photoShare)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {insights.topHelpfulReviews.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-medium text-[var(--rb-fg)]">도움수 TOP 리뷰</p>
              <ul className="mt-3 space-y-2">
                {insights.topHelpfulReviews.slice(0, 5).map((item, index) => (
                  <li key={`${item.text.slice(0, 24)}-${index}`} className="flex items-start justify-between gap-4 rounded-[12px] border border-[color:#e6e8f2] bg-white px-3 py-2.5 text-sm">
                    <p className="min-w-0 flex-1 truncate text-[var(--rb-muted-strong)]" title={item.text}>
                      {item.text}
                    </p>
                    <span className="shrink-0 text-xs text-[var(--rb-muted)]">{item.helpfulCount} 도움</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </Surface>
  );
}