import { describe, expect, it } from "vitest";
import { computeSmartstoreInsights } from "./smartstore_insights";
import type { ClassifiedReview } from "@/lib/types";

function review(overrides: Partial<ClassifiedReview>): ClassifiedReview {
  return {
    text: "리뷰 본문",
    rating: 3,
    reviewedAt: null,
    sentiment: "neutral",
    category: "기타",
    ...overrides
  };
}

describe("computeSmartstoreInsights", () => {
  it("returns null when no smartstore form fields exist (generic upload)", () => {
    const rows = [review({ text: "좋아요", rating: 5, sentiment: "positive" })];
    expect(computeSmartstoreInsights(rows)).toBeNull();
  });

  it("computes 검수 + 리서치 from smartstore form fields", () => {
    const rows: ClassifiedReview[] = [
      review({
        text: "배송이 너무 늦었어요",
        rating: 1,
        sentiment: "negative",
        category: "배송",
        productName: "강아지 배변패드 100매",
        replyYn: "N",
        hasPhoto: false,
        helpfulCount: 3
      }),
      review({
        text: "상품이 깨져서 왔어요",
        rating: 1,
        sentiment: "negative",
        category: "품질",
        productName: "강아지 배변패드 100매",
        replyYn: "Y",
        hasPhoto: true,
        helpfulCount: 7,
        bestReviewYn: "Y"
      }),
      review({
        text: "사진이 잘 나옵니다",
        rating: 5,
        sentiment: "positive",
        category: "품질",
        productName: "반려동물 카메라",
        replyYn: "Y",
        hasPhoto: true,
        helpfulCount: 0,
        bestReviewYn: "N"
      }),
      review({
        text: "아직 사용 전이에요",
        rating: null,
        sentiment: "neutral",
        category: "기타",
        productName: "반려동물 카메라",
        replyYn: "Y"
      }),
      review({
        text: "화질이 좋습니다",
        rating: 5,
        sentiment: "positive",
        category: "사용성",
        productName: "반려동물 카메라",
        replyYn: "Y",
        helpfulCount: 2
      })
    ];

    const insights = computeSmartstoreInsights(rows);
    expect(insights).not.toBeNull();

    // 리서치: 상품별 분포 (건수 많은 순 — 카메라 3건이 먼저 온다)
    expect(insights!.productStats).toHaveLength(2);
    expect(insights!.productStats[0]!.productName).toBe("반려동물 카메라");
    expect(insights!.productStats[0]!.reviewCount).toBe(3);
    expect(insights!.productStats[0]!.avgRating).toBe(5);
    expect(insights!.productStats[0]!.negativeRatio).toBe(0);
    expect(insights!.productStats[1]!.productName).toBe("강아지 배변패드 100매");
    expect(insights!.productStats[1]!.reviewCount).toBe(2);
    expect(insights!.productStats[1]!.negativeRatio).toBe(1);
    expect(insights!.productStats[1]!.photoShare).toBe(0.5);

    // 리서치: 사진/베스트/도움수
    expect(insights!.photoReviewCount).toBe(2);
    expect(insights!.photoReviewRatio).toBeCloseTo(0.4);
    expect(insights!.bestReviewCount).toBe(1);
    expect(insights!.totalHelpful).toBe(12);
    expect(insights!.topHelpfulReviews[0]?.helpfulCount).toBe(7);

    // 검수: 답글 없는 부정 리뷰 1건, 사진 부정 리뷰 1건
    expect(insights!.unrepliedNegativeCount).toBe(1);
    expect(insights!.unrepliedNegative[0]?.review.text).toBe("배송이 너무 늦었어요");
    expect(insights!.unrepliedNegative[0]?.productName).toBe("강아지 배변패드 100매");
    expect(insights!.negativeWithPhotoCount).toBe(1);
    expect(insights!.negativeWithPhoto[0]?.review.text).toBe("상품이 깨져서 왔어요");
  });

  it("returns null for an empty dataset", () => {
    expect(computeSmartstoreInsights([])).toBeNull();
  });
});