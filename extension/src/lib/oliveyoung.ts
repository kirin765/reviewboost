import { CollectError } from "./types";

// Observed on the desktop product page, 2026-10-11. The desktop site calls
// the mobile review API too; subsequent requests omit page and use this cursor.
export const OLIVEYOUNG_REVIEW_URL = "https://m.oliveyoung.co.kr/review/api/v2/reviews/cursor";
export type OliveYoungCursor = { cursorId: string | number; cursorScore: number | null; cursorCount: number | null };

export function oliveYoungReviewBody(goodsNumber: string, cursor?: OliveYoungCursor) {
  return {
    goodsNumber,
    size: 10,
    sortType: "USEFUL_SCORE_DESC",
    reviewType: "ALL",
    ...(cursor ?? { page: 0 })
  };
}

export function parseOliveYoungPage(json: unknown): {
  contents: Record<string, unknown>[];
  nextCursor?: OliveYoungCursor;
} {
  const root = json as Record<string, unknown> | null;
  const data = root?.data as Record<string, unknown> | undefined;
  if (root?.code === 401 || data?.loginRequired === true) {
    throw new CollectError("LOGIN", "올리브영 로그인이 필요합니다. 상품 페이지에서 로그인한 뒤 다시 시도해 주세요.");
  }
  if (root?.code === 403 || root?.code === 429) {
    throw new CollectError("BLOCKED", "올리브영이 리뷰 요청을 제한했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (root?.code !== 200 || !Array.isArray(data?.goodsReviewList) || typeof data.hasNext !== "boolean") {
    throw new CollectError("UNSUPPORTED", "올리브영 리뷰 응답을 읽을 수 없습니다.");
  }
  const contents = data.goodsReviewList;
  if (!contents.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
    throw new CollectError("UNSUPPORTED", "올리브영 리뷰 형식이 변경되었습니다.");
  }
  if (!data.hasNext || contents.length === 0) return { contents };
  const id = data.nextCursorId;
  const score = data.nextCursorScore;
  const count = data.nextCursorCount;
  if (!((typeof id === "string" && id.length > 0) || (typeof id === "number" && Number.isFinite(id))) ||
      !(score === null || (typeof score === "number" && Number.isFinite(score))) ||
      !(count === null || (typeof count === "number" && Number.isFinite(count)))) {
    throw new CollectError("UNSUPPORTED", "올리브영의 다음 리뷰 페이지를 확인할 수 없습니다.");
  }
  return { contents, nextCursor: { cursorId: id, cursorScore: score, cursorCount: count } };
}

export function oliveYoungImageUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const path = value.trim();
  const url = /^\d{4}\/\d{2}\/\d{2}\//.test(path)
    ? `https://image.oliveyoung.co.kr/uploads/images/gdasEditor/${path}`
    : path.startsWith("//") ? `https:${path}` : path;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}
