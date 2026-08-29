import type { RawReview } from "./types";

/**
 * 스마트스토어 판매자센터 "리뷰관리 → 엑셀 다운로드" 공식 컬럼(25열, 순서 고정).
 * 네이버 공식 리뷰 내보내기와 같은 형태로 내보내서, 다른 도구/운영 프로세스(카페24 등)에
 * 그대로 이어 쓸 수 있게 한다. 익스텐션이 모르는 열(답글/전시상태 등)은 빈 값으로 둔다.
 */
export const SMARTSTORE_REVIEW_HEADERS = [
  "상품번호",
  "상품명",
  "리뷰구분",
  "구매자평점",
  "포토/영상",
  "리뷰상세내용",
  "리뷰도움수",
  "등록자",
  "리뷰등록일",
  "최종수정일",
  "리뷰글번호",
  "관련리뷰글번호",
  "관련리뷰상세내용",
  "전시상태",
  "답글여부",
  "답글등록일시",
  "베스트리뷰",
  "베스트리뷰선정일시",
  "이벤트번호",
  "혜택지급",
  "혜택지급일시",
  "유저정보 등록 항목",
  "상품주문번호",
  "풀필먼트사",
  "리뷰이동일"
] as const;

/** 공식 폼의 상품번호/상품명 — 팝업이 가진 페이지 컨텍스트에서 채운다. */
export type ReviewExportContext = {
  productNo?: string | null;
  productTitle?: string | null;
};

/** ISO → 공식 형식 "YYYY.MM.DD. HH:mm:ss" (KST). 파싱 실패 시 빈 문자열. */
export function formatOfficialDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}.${get("month")}.${get("day")}. ${get("hour")}:${get("minute")}:${get("second")}`;
}

/**
 * 공식 25열 순서대로 한 리뷰의 값을 채운다.
 * - 포토/영상: 이미지 URL 을 줄바꿈으로 구분 (xlsx 는 개행 보존, csv 는 공백으로 병합).
 * - 리뷰등록일: KST 기준 공식 표기.
 */
export function reviewToOfficialRow(review: RawReview, ctx: ReviewExportContext = {}): string[] {
  return [
    ctx.productNo ?? "",
    ctx.productTitle ?? "",
    "", // 리뷰구분
    review.rating != null ? String(review.rating) : "",
    (review.imageUrls ?? []).join("\n"), // 포토/영상
    review.text, // 리뷰상세내용
    review.helpfulCount != null && review.helpfulCount > 0 ? String(review.helpfulCount) : "",
    review.author ?? "",
    formatOfficialDate(review.reviewedAt),
    "", // 최종수정일
    "", // 리뷰글번호
    "", // 관련리뷰글번호
    "", // 관련리뷰상세내용
    "", // 전시상태
    "", // 답글여부
    "", // 답글등록일시
    "", // 베스트리뷰
    "", // 베스트리뷰선정일시
    "", // 이벤트번호
    "", // 혜택지급
    "", // 혜택지급일시
    "", // 유저정보 등록 항목
    "", // 상품주문번호
    "", // 풀필먼트사
    "" // 리뷰이동일
  ];
}

/** 공식 폼에서 숫자 셀로 써야 하는 열 인덱스 (구매자평점=3, 리뷰도움수=6). */
export const OFFICIAL_NUMERIC_COLUMNS = new Set([3, 6]);
