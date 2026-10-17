export const surveyTasks = {
  weekly_review: "내 상품의 리뷰를 정기적으로 점검",
  product_research: "상품 조사·리뷰 비교",
  client_report: "고객사 보고서 작성",
  backup: "리뷰 파일 보관",
  other: "그 밖의 용도"
} as const;

export const surveySources = {
  google: "구글 검색",
  naver: "네이버 검색·블로그",
  chrome_store: "Chrome 웹 스토어",
  youtube: "유튜브",
  community: "커뮤니티·카페",
  recommendation: "지인 추천",
  ai: "ChatGPT 등 AI 답변",
  other: "기타·기억나지 않음"
} as const;

export function parseExtensionSurvey(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const { task, source } = input as Record<string, unknown>;
  const valid = (value: unknown, options: object) => value === undefined || value === "" ||
    (typeof value === "string" && Object.prototype.hasOwnProperty.call(options, value));
  if (!valid(task, surveyTasks) || !valid(source, surveySources) || (!task && !source)) return null;
  return { task: task || null, source: source || null };
}
