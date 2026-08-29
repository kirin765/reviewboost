/**
 * 스마트스토어 판매자센터 "리뷰관리 → 엑셀 다운로드" 공식 폼(25열) 처리.
 *
 * 업로드 단계에서 이 폼을 감지하면 리뷰상세내용/구매자평점/리뷰등록일을 자동 매핑하고,
 * 검수·리서치에 쓸 여분 필드(등록자, 포토/영상, 리뷰도움수, 답글여부, 베스트리뷰,
 * 상품명/상품번호)를 함께 읽는다. 열 이름은 판매자센터 공식 내보내기와 동일한 순서·표기다.
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

/** 공식 폼에서 검수·리서치에 활용하는 열 → 실제 파일의 열 이름 매핑. */
export type SmartstoreColumnMap = {
  /** 리뷰 본문 (리뷰상세내용) */
  text: string;
  /** 구매자평점 */
  rating: string | null;
  /** 리뷰등록일 */
  date: string | null;
  /** 등록자 */
  author: string | null;
  /** 포토/영상 */
  photo: string | null;
  /** 리뷰도움수 */
  helpful: string | null;
  /** 답글여부 */
  reply: string | null;
  /** 베스트리뷰 */
  best: string | null;
  /** 상품명 */
  productName: string | null;
  /** 상품번호 */
  productNo: string | null;
};

function normalizeHeaderName(value: string): string {
  return value.trim();
}

/** 공식 25열 중 실제 파일의 헤더와 일치하는 열 이름 목록. */
export function matchSmartstoreHeaders(columns: string[]): string[] {
  const present = new Set(columns.map((c) => normalizeHeaderName(c)));
  return (SMARTSTORE_REVIEW_HEADERS as readonly string[]).filter((header) => present.has(header));
}

/**
 * 스마트스토어 공식 리뷰 폼인지 판별한다.
 * 공식 25열 중 8개 이상이 일치하고, 핵심인 리뷰상세내용·구매자평점이 모두 있어야 인정한다.
 * (리뷰상세내용만 있으면 다른 업체 엑셀과의 오탐이 크고, 8열 미만이면 부분 내보내기로 본다.)
 */
export function isSmartstoreReviewForm(columns: string[]): boolean {
  const matched = matchSmartstoreHeaders(columns);
  if (matched.length < 8) return false;
  return matched.includes("리뷰상세내용") && matched.includes("구매자평점");
}

/** 공식 폼이면 열 매핑을 돌려주고, 아니면 null. */
export function mapSmartstoreColumns(columns: string[]): SmartstoreColumnMap | null {
  if (!isSmartstoreReviewForm(columns)) return null;

  const find = (name: string): string | null => columns.find((c) => normalizeHeaderName(c) === name) ?? null;
  return {
    // 공식 폼은 리뷰상세내용이 항상 있어 isSmartstoreReviewForm 통과 시 null이 될 수 없다.
    text: find("리뷰상세내용") ?? find("관련리뷰상세내용") ?? columns[0] ?? "",
    rating: find("구매자평점"),
    date: find("리뷰등록일") ?? find("최종수정일"),
    author: find("등록자"),
    photo: find("포토/영상"),
    helpful: find("리뷰도움수"),
    reply: find("답글여부"),
    best: find("베스트리뷰"),
    productName: find("상품명"),
    productNo: find("상품번호")
  };
}

/** "Y"/"N"/"예"/"아니오"/"1"/"0" 같은 공식 폼의 예·아니오 값을 정규화한다. */
export function toYnOrNull(value: string): "Y" | "N" | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s || s === "-" || s === "null" || s === "undefined") return null;
  if (s === "y" || s === "yes" || s === "예" || s === "1" || s === "true") return "Y";
  if (s === "n" || s === "no" || s === "아니오" || s === "아니요" || s === "0" || s === "false") return "N";
  return null;
}