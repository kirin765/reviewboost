import type {
  ClassifiedReview,
  SmartstoreInsights,
  SmartstoreProductStat,
  SmartstoreScreeningItem,
  SmartstoreTopHelpful
} from "@/lib/types";

/**
 * 스마트스토어 공식 리뷰 엑셀 폼에서 추출한 여분 필드를 바탕으로
 * "검수"(문제 리뷰 선별) + "리서치"(상품·운영 인사이트)를 계산한다.
 *
 * 스마트스토어 여분 필드(상품명/등록자/포토/도움수/답글/베스트)가 하나도 없으면
 * 일반 업로드로 보고 null을 돌려준다 — 이 경우 UI에서 섹션을 숨긴다.
 */

function hasSmartstoreFields(rows: ClassifiedReview[]): boolean {
  return rows.some(
    (r) =>
      r.productName ||
      r.author ||
      r.hasPhoto === true ||
      r.replyYn != null ||
      r.bestReviewYn != null ||
      r.helpfulCount != null
  );
}

function toScreeningItem(r: ClassifiedReview): SmartstoreScreeningItem {
  return { review: r, productName: r.productName ?? null };
}

export function computeSmartstoreInsights(classified: ClassifiedReview[]): SmartstoreInsights | null {
  if (classified.length === 0 || !hasSmartstoreFields(classified)) return null;

  // === 리서치: 상품별 리뷰 분포 (건수 많은 순) ===
  const byProduct = new Map<string, ClassifiedReview[]>();
  for (const r of classified) {
    const name = r.productName?.trim() || "(상품명 없음)";
    const list = byProduct.get(name) ?? [];
    list.push(r);
    byProduct.set(name, list);
  }

  const productStats: SmartstoreProductStat[] = Array.from(byProduct.entries())
    .map(([productName, rows]) => {
      const ratings = rows
        .map((r) => r.rating)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const negativeRows = rows.filter((r) => r.sentiment === "negative").length;
      const photoRows = rows.filter((r) => r.hasPhoto).length;
      return {
        productName,
        reviewCount: rows.length,
        avgRating: ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length,
        negativeRatio: rows.length === 0 ? 0 : negativeRows / rows.length,
        photoShare: rows.length === 0 ? 0 : photoRows / rows.length
      };
    })
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10);

  // === 리서치: 사진/영상·베스트·도움수 ===
  const photoReviews = classified.filter((r) => r.hasPhoto);
  const bestReviewCount = classified.filter((r) => r.bestReviewYn === "Y").length;
  const helpfulRows = classified.filter((r) => typeof r.helpfulCount === "number" && r.helpfulCount! > 0);
  const totalHelpful = helpfulRows.reduce((sum, r) => sum + (r.helpfulCount ?? 0), 0);
  const topHelpfulReviews: SmartstoreTopHelpful[] = [...helpfulRows]
    .sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0))
    .slice(0, 5)
    .map((r) => ({
      text: r.text.slice(0, 300),
      rating: r.rating ?? null,
      productName: r.productName ?? null,
      helpfulCount: r.helpfulCount ?? 0
    }));

  // === 검수: 답글 없는 부정 리뷰 / 사진이 붙은 부정 리뷰 ===
  const unrepliedNegative = classified.filter((r) => r.sentiment === "negative" && r.replyYn === "N");
  const negativeWithPhoto = classified.filter((r) => r.sentiment === "negative" && r.hasPhoto);

  return {
    productStats,
    photoReviewCount: photoReviews.length,
    photoReviewRatio: classified.length === 0 ? 0 : photoReviews.length / classified.length,
    bestReviewCount,
    totalHelpful,
    topHelpfulReviews,
    unrepliedNegativeCount: unrepliedNegative.length,
    unrepliedNegative: unrepliedNegative.slice(0, 5).map(toScreeningItem),
    negativeWithPhotoCount: negativeWithPhoto.length,
    negativeWithPhoto: negativeWithPhoto.slice(0, 5).map(toScreeningItem)
  };
}