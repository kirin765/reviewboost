import {
  COLLECT_DEFAULT_MAX,
  COLLECT_HARD_MAX,
  RB_ANALYZE_ENDPOINT,
  RB_CONNECT_PAGE,
  RB_REPORT_PAGE,
  REPORT_STORAGE_KEY
} from "../lib/config";
import { reviewsToCsv } from "../lib/csv";
import type { ReviewExportContext } from "../lib/excel-form";
import { addHistory, clearHistory, loadHistory, makeHistoryId, removeHistory, type HistoryEntry } from "../lib/history";
import type { ContentRequest, PongResponse, StreamMessage } from "../lib/messages";
import { toReviewRows } from "../lib/normalize";
import type { Platform, RawReview } from "../lib/types";
import { clampToRemaining, isConnected, loadUsage, recordCollected, reportLimitHit, type UsageState } from "../lib/usage";
import { buildSupportRequest, RB_SUPPORT_ENDPOINT, validateSupportPayload, type SupportCategory } from "../lib/support";
import { reviewsToXlsx } from "../lib/xlsx";

const el = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node;
};

const collectPane = el("collect-pane");
const resultPane = el("result-pane");
const errorPane = el("error-pane");
const paywallPane = el("paywall-pane");
const usageEl = el("usage");
const paywallText = el("paywall-text");
const paywallUpgrade = el("paywall-upgrade") as HTMLButtonElement;
const previewEl = el("preview");
const resultUpsell = el("result-upsell");
const resultUpsellText = el("result-upsell-text");
const resultUpgrade = el("result-upgrade") as HTMLButtonElement;
const accountBtn = el("account") as HTMLButtonElement;
const ctxLabel = el("ctx");
const maxInput = el("max") as HTMLInputElement;
const collectBtn = el("collect") as HTMLButtonElement;
const progress = el("progress");
const barFill = el("bar-fill");
const progressText = el("progress-text");
const hint = el("hint");
const countEl = el("count");
const errorText = el("error-text");
const historyPane = el("history-pane");
const historyList = el("history-list");
const historyClear = el("history-clear") as HTMLButtonElement;
const historyEmpty = el("history-empty");
const tabCollect = el("tab-collect") as HTMLButtonElement;
const tabHistory = el("tab-history") as HTMLButtonElement;
const tabCs = el("tab-cs") as HTMLButtonElement;
const csPane = el("cs-pane");
const csCategory = el("cs-category") as HTMLSelectElement;
const csEmail = el("cs-email") as HTMLInputElement;
const csMessage = el("cs-message") as HTMLTextAreaElement;
const csSend = el("cs-send") as HTMLButtonElement;
const csStatus = el("cs-status");

let tabId: number | null = null;
let tabUrl = "";
let tabTitle = "";
let tabProductId: string | null = null;
let platform: Platform | null = null;
let restored: { platform: Platform; url: string } | null = null;
let collected: RawReview[] = [];
let usage: UsageState | null = null;
let lastRequested = 0;
let lastMaxItems = 0;
/** 내보내기(스마트스토어 공식 폼)에 넣을 상품번호/상품명. */
let exportCtx: ReviewExportContext = {};

/** 수집 모드에서 마지막으로 보여준 패널 (탭 전환 복귀용). */
let currentCollect: HTMLElement = collectPane;

function setActiveTab(name: "collect" | "history" | "cs"): void {
  tabCollect.classList.toggle("active", name === "collect");
  tabHistory.classList.toggle("active", name === "history");
  tabCs.classList.toggle("active", name === "cs");
}

function show(pane: HTMLElement): void {
  for (const p of [collectPane, resultPane, errorPane, paywallPane, historyPane, csPane]) p.classList.add("hidden");
  pane.classList.remove("hidden");
  if ([collectPane, resultPane, errorPane, paywallPane].includes(pane)) {
    currentCollect = pane;
    setActiveTab("collect");
  }
}

function connectUrl(checkout = false): string {
  const base = `${RB_CONNECT_PAGE}?ext=${chrome.runtime.id}`;
  return checkout ? `${base}&checkout=1` : base;
}

/** 한도/가격 공통 카피 — 팝업 문구는 이 한 곳에서만 관리한다. */
const PAID_PLAN_COPY = "무제한 — 월 ₩4,900";

function showPaywall(): void {
  if (!usage) return;
  if (usage.tier === "paid") {
    // 유료 플랜은 무제한이라 도달하지 않는다 — 방어 코드.
    paywallText.textContent = `오늘 수집 한도(${(usage.limit ?? 0).toLocaleString()}개)를 모두 사용했어요. 한도는 매일 자정(KST)에 초기화됩니다.`;
  } else {
    paywallText.textContent = `무료로는 하루 ${(usage.limit ?? 50).toLocaleString()}개까지 수집할 수 있어요. 익스텐션 플랜은 ${PAID_PLAN_COPY}.`;
    void reportLimitHit();
  }
  paywallUpgrade.classList.toggle("hidden", usage.tier === "paid");
  show(paywallPane);
}

/** 한도에 걸려 잘렸거나 잔여가 0이 된 수집 직후, 결과 화면 안에 업셀 배너를 띄운다. */
function maybeShowResultUpsell(): void {
  if (!usage || usage.tier === "paid") return;
  const clamped = lastMaxItems < lastRequested || (usage.remaining ?? 0) <= 0;
  if (!clamped) return;
  resultUpsellText.textContent =
    `오늘 무료 한도 ${(usage.limit ?? 50).toLocaleString()}개를 모두 썼습니다 · 익스텐션 플랜은 ${PAID_PLAN_COPY}`;
  resultUpsell.classList.remove("hidden");
  void reportLimitHit();
}

function renderUsage(): void {
  if (!usage) return;
  const tierLabel = usage.tier === "paid" ? " · 유료 플랜 (무제한)" : usage.authenticated ? " · 무료 계정" : "";
  usageEl.innerHTML = "";
  if (usage.limit === null || usage.remaining === null) {
    // 유료 플랜: 무제한.
    usageEl.append(
      `오늘 수집 `,
      Object.assign(document.createElement("strong"), { textContent: "무제한" }),
      ` · 유료 플랜`,
      tierLabel
    );
  } else {
    usageEl.append(`오늘 수집 `, Object.assign(document.createElement("strong"), {
      textContent: `${(usage.used ?? 0).toLocaleString()} / ${usage.limit.toLocaleString()}개`
    }), ` · 잔여 ${(usage.remaining ?? 0).toLocaleString()}개`, tierLabel);
  }
  usageEl.classList.remove("hidden");
  if ((usage.remaining ?? 0) <= 0 && !collectPane.classList.contains("hidden")) showPaywall();
}

/** 결과 화면 미리보기 — 스펙 "건수 + 샘플 몇 줄": 첫 2개 리뷰(별점 + 내용 ~60자). */
function renderPreview(): void {
  previewEl.innerHTML = "";
  const sample = collected.slice(0, 2);
  previewEl.classList.toggle("hidden", sample.length === 0);
  for (const review of sample) {
    const li = document.createElement("li");
    if (review.rating != null) {
      li.append(Object.assign(document.createElement("span"), {
        className: "stars",
        textContent: `★${review.rating} `
      }));
    }
    const text = review.text.trim();
    li.append(text.length > 60 ? `${text.slice(0, 60)}…` : text);
    previewEl.appendChild(li);
  }
}

async function refreshUsage(): Promise<void> {
  usage = await loadUsage();
  accountBtn.textContent = (await isConnected()) ? "내 계정" : "계정 연결";
  renderUsage();
}

function sendToTab<T = unknown>(msg: ContentRequest): Promise<T> {
  if (tabId == null) return Promise.reject(new Error("no tab"));
  return chrome.tabs.sendMessage(tabId, msg) as Promise<T>;
}

const platformLabel = (p: Platform): string => (p === "coupang" ? "쿠팡" : "스마트스토어");

function fmtHistoryTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function historyEntryFromCurrent(): HistoryEntry {
  return {
    id: makeHistoryId(),
    platform: platform ?? "smartstore",
    productId: "",
    productUrl: tabUrl,
    productTitle: tabTitle || document.title,
    count: collected.length,
    createdAt: Date.now(),
    reviews: collected
  };
}

function renderHistory(entries: HistoryEntry[]): void {
  historyList.innerHTML = "";
  historyEmpty.classList.toggle("hidden", entries.length !== 0);
  historyClear.classList.toggle("hidden", entries.length === 0);
  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "history-item";

    const info = document.createElement("div");
    info.className = "h-info";
    const title = document.createElement("div");
    title.className = "h-title";
    title.textContent = entry.productTitle || `${platformLabel(entry.platform)} 상품`;
    const sub = document.createElement("div");
    sub.className = "h-sub";
    sub.textContent = `${platformLabel(entry.platform)} · ${entry.count.toLocaleString()}개 · ${fmtHistoryTime(entry.createdAt)}`;
    info.append(title, sub);

    const restore = document.createElement("button");
    restore.className = "h-btn";
    restore.textContent = "복원";
    restore.dataset.action = "restore";
    restore.dataset.id = entry.id;

    const del = document.createElement("button");
    del.className = "h-btn h-del";
    del.textContent = "삭제";
    del.dataset.action = "delete";
    del.dataset.id = entry.id;

    li.append(info, restore, del);
    historyList.appendChild(li);
  }
}

async function refreshHistory(): Promise<void> {
  try {
    renderHistory(await loadHistory());
  } catch {
    historyPane.classList.add("hidden");
  }
}

function restoreHistoryEntry(id: string): void {
  void loadHistory().then((entries) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    collected = entry.reviews;
    restored = { platform: entry.platform, url: entry.productUrl };
    exportCtx = { productNo: entry.productId, productTitle: entry.productTitle };
    countEl.textContent = collected.length.toLocaleString();
    renderPreview();
    resultUpsell.classList.add("hidden");
    show(resultPane);
  });
}

function onHistoryClick(ev: MouseEvent): void {
  const target = (ev.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target?.dataset?.id) return;
  if (target.dataset.action === "restore") {
    restoreHistoryEntry(target.dataset.id);
  } else if (target.dataset.action === "delete") {
    void removeHistory(target.dataset.id).then(renderHistory);
  }
}

function notProduct(): void {
  ctxLabel.textContent = "지원 상품 페이지가 아닙니다";
  collectBtn.disabled = true;
  hint.textContent = "쿠팡 또는 스마트스토어 상품 상세 페이지에서 실행해 주세요.";
}

async function init(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  tabUrl = tab?.url ?? "";
  if (tabId == null) {
    notProduct();
    return;
  }
  let pong: PongResponse | undefined;
  try {
    pong = await sendToTab<PongResponse>({ type: "PING" });
  } catch {
    notProduct();
    return;
  }
  platform = pong?.ctx.platform ?? null;
  if (!platform || !pong?.ctx.productId) {
    notProduct();
    return;
  }
  tabTitle = pong?.ctx.title ?? tabTitle;
  tabProductId = pong?.ctx.productId ?? null;
  ctxLabel.textContent = platform === "coupang" ? "쿠팡 상품 감지됨" : "스마트스토어 상품 감지됨";
  collectBtn.disabled = false;
  hint.textContent = "버튼을 누르면 이 상품의 리뷰를 모읍니다.";
}

async function initUsage(): Promise<void> {
  try {
    await refreshUsage();
  } catch {
    // 사용량 표시는 부가 기능 — 실패해도 수집 UI는 유지
  }
}

chrome.runtime.onMessage.addListener((msg: StreamMessage) => {
  if (msg.type === "PROGRESS") {
    progressText.textContent = `${msg.collected.toLocaleString()}개 수집 중…`;
    if (msg.total && msg.total > 0) {
      const pct = Math.min(100, Math.round((msg.collected / msg.total) * 100));
      barFill.style.width = `${pct}%`;
    } else {
      barFill.style.width = "40%";
    }
  } else if (msg.type === "DONE") {
    collected = msg.reviews;
    restored = null;
    exportCtx = { productNo: tabProductId, productTitle: tabTitle || document.title };
    countEl.textContent = collected.length.toLocaleString();
    renderPreview();
    resultUpsell.classList.add("hidden");
    show(resultPane);
    void addHistory(historyEntryFromCurrent()).then(renderHistory);
    void recordCollected(collected.length)
      .then(() => refreshUsage())
      .then(() => maybeShowResultUpsell());
  } else if (msg.type === "ERROR") {
    errorText.textContent = msg.message;
    show(errorPane);
  }
});

function startCollect(): void {
  const raw = Number(maxInput.value);
  const requested = Math.max(10, Math.min(COLLECT_HARD_MAX, Number.isFinite(raw) ? raw : COLLECT_DEFAULT_MAX));
  // remaining 이 null(유료·무제한)이면 한도로 자르지 않는다. usage 미조회 시에만 안전 상한 사용.
  const maxItems = clampToRemaining(requested, usage ? usage.remaining : COLLECT_HARD_MAX);
  lastRequested = requested;
  lastMaxItems = maxItems;
  if (maxItems <= 0) {
    showPaywall();
    return;
  }
  collectBtn.disabled = true;
  progress.classList.remove("hidden");
  barFill.style.width = "5%";
  progressText.textContent = "수집 시작…";
  void sendToTab({ type: "COLLECT_START", maxItems }).catch(() => {
    errorText.textContent = "콘텐츠 스크립트와 통신하지 못했습니다. 페이지를 새로고침해 주세요.";
    show(errorPane);
  });
}

/** 스마트스토어 판매자센터 엑셀 다운로드 파일명 규칙과 동일 — review_YYYYMMDD_HHMMSS (로컬 시각). */
function stamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function triggerDownload(filename: string, data: string | Uint8Array, mime: string): void {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function analyze(): Promise<void> {
  const analyzeBtn = el("analyze") as HTMLButtonElement;
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "분석 요청 중…";
  try {
    const res = await fetch(RB_ANALYZE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: restored?.platform ?? platform,
        productUrl: restored?.url ?? tabUrl,
        reviews: toReviewRows(collected)
      })
    });
    if (!res.ok) {
      let message = "분석 요청에 실패했습니다.";
      try {
        const data = (await res.json()) as { error?: { message?: string } };
        if (data?.error?.message) message = data.error.message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    const payload = await res.json();
    await chrome.storage.local.set({ [REPORT_STORAGE_KEY]: payload });
    await chrome.tabs.create({ url: `${RB_REPORT_PAGE}?ext=${chrome.runtime.id}` });
    window.close();
  } catch (err) {
    errorText.textContent = err instanceof Error ? err.message : "분석 요청에 실패했습니다.";
    show(errorPane);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "ReviewBoost로 분석";
  }
}

function resetToCollect(): void {
  if (usage && (usage.remaining ?? 0) <= 0) {
    showPaywall();
    return;
  }
  progress.classList.add("hidden");
  barFill.style.width = "0%";
  collectBtn.disabled = platform == null;
  show(collectPane);
}

/** CS 문의 폼 전송 — 검증은 순수 함수(validateSupportPayload)에 위임. */
async function sendSupport(): Promise<void> {
  csStatus.className = "muted small";
  csStatus.textContent = "";
  const email = csEmail.value.trim();
  const category = csCategory.value;
  const message = csMessage.value.trim();

  const invalid = validateSupportPayload(email, category, message);
  if (invalid) {
    csStatus.className = "err";
    csStatus.textContent = invalid;
    return;
  }

  csSend.disabled = true;
  csSend.textContent = "보내는 중…";
  try {
    const res = await fetch(
      RB_SUPPORT_ENDPOINT,
      buildSupportRequest({ email, category: category as SupportCategory, message })
    );
    if (res.ok) {
      csStatus.className = "ok";
      csStatus.textContent = "접수됐습니다. 답변은 이메일로 드려요.";
      csCategory.value = "";
      csEmail.value = "";
      csMessage.value = "";
    } else {
      let reason = "전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
      try {
        const data = (await res.json()) as { error?: { message?: string; help?: string[] } };
        reason = data?.error?.message ?? data?.error?.help?.[0] ?? reason;
      } catch {
        /* 응답이 JSON이 아니면 기본 문구 */
      }
      csStatus.className = "err";
      csStatus.textContent = reason;
    }
  } catch {
    csStatus.className = "err";
    csStatus.textContent = "전송에 실패했습니다. 브라우저에서 reviewboost.co.kr/support 로도 접수할 수 있어요.";
  } finally {
    csSend.disabled = false;
    csSend.textContent = "보내기";
  }
}

collectBtn.addEventListener("click", startCollect);
tabCollect.addEventListener("click", () => {
  setActiveTab("collect");
  show(currentCollect);
});
tabHistory.addEventListener("click", () => {
  setActiveTab("history");
  void refreshHistory();
  show(historyPane);
});
tabCs.addEventListener("click", () => {
  setActiveTab("cs");
  show(csPane);
});
csSend.addEventListener("click", () => void sendSupport());
el("cancel").addEventListener("click", () => {
  void sendToTab({ type: "COLLECT_CANCEL" }).catch(() => {});
  resetToCollect();
});
el("dl-xlsx").addEventListener("click", () =>
  triggerDownload(
    `review_${stamp()}.xlsx`,
    reviewsToXlsx(collected, exportCtx),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
);
el("dl-csv").addEventListener("click", () =>
  triggerDownload(`review_${stamp()}.csv`, reviewsToCsv(collected, exportCtx), "text/csv;charset=utf-8")
);
el("analyze").addEventListener("click", () => void analyze());
el("reset").addEventListener("click", resetToCollect);
el("error-reset").addEventListener("click", resetToCollect);
historyList.addEventListener("click", onHistoryClick);
historyClear.addEventListener("click", () => void clearHistory().then(() => void refreshHistory()));
accountBtn.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl() }));
paywallUpgrade.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl(true) }));
resultUpgrade.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl(true) }));

void init();
void initUsage();
void refreshHistory();
