/**
 * ReviewBoost 연동 설정.
 * 운영 도메인은 reviewboost.co.kr. 로컬에서 익스텐션을 테스트할 땐
 * RB_ORIGIN을 http://localhost:3001 로 바꿔 빌드한다.
 */
export const RB_ORIGIN = "https://reviewboost.co.kr";

/** 익스텐션 → ReviewBoost 무료 분석(깔때기) 엔드포인트 */
export const RB_ANALYZE_ENDPOINT = `${RB_ORIGIN}/api/extension/analyze`;

/** 분석 결과를 렌더하는 ReviewBoost 페이지 */
export const RB_REPORT_PAGE = `${RB_ORIGIN}/extension-report`;

/** chrome.storage.local 에 분석 payload를 임시 보관하는 키 */
export const REPORT_STORAGE_KEY = "rb_report";

/** 수집 정중함/안전 한도 */
export const COLLECT_DEFAULT_MAX = 300;
export const COLLECT_HARD_MAX = 2000;
export const COLLECT_PAGE_DELAY_MIN_MS = 300;
export const COLLECT_PAGE_DELAY_MAX_MS = 600;
