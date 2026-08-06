import {
  COLLECT_DEFAULT_MAX,
  COLLECT_HARD_MAX,
  RB_ANALYZE_ENDPOINT,
  RB_CONNECT_PAGE,
  RB_REPORT_PAGE,
  REPORT_STORAGE_KEY
} from "../lib/config";
import { reviewsToCsv } from "../lib/csv";
import type { ContentRequest, PongResponse, StreamMessage } from "../lib/messages";
import { toReviewRows } from "../lib/normalize";
import type { Platform, RawReview } from "../lib/types";
import { clampToRemaining, isConnected, loadUsage, recordCollected, reportLimitHit, type UsageState } from "../lib/usage";
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

let tabId: number | null = null;
let tabUrl = "";
let platform: Platform | null = null;
let collected: RawReview[] = [];
let usage: UsageState | null = null;
let lastRequested = 0;
let lastMaxItems = 0;

function show(pane: HTMLElement): void {
  for (const p of [collectPane, resultPane, errorPane, paywallPane]) p.classList.add("hidden");
  pane.classList.remove("hidden");
}

function connectUrl(checkout = false): string {
  const base = `${RB_CONNECT_PAGE}?ext=${chrome.runtime.id}`;
  return checkout ? `${base}&checkout=1` : base;
}

/** 한도/가격 공통 카피 — 팝업 문구는 이 한 곳에서만 관리한다. */
const PAID_PLAN_COPY = "하루 2,000개 — 월 ₩4,900";

function showPaywall(): void {
  if (!usage) return;
  if (usage.tier === "paid") {
    paywallText.textContent = `오늘 수집 한도(${usage.limit.toLocaleString()}개)를 모두 사용했어요. 한도는 매일 자정(KST)에 초기화됩니다.`;
  } else {
    paywallText.textContent = `무료로는 하루 ${usage.limit.toLocaleString()}개까지 수집할 수 있어요. 익스텐션 플랜은 ${PAID_PLAN_COPY}.`;
    void reportLimitHit();
  }
  paywallUpgrade.classList.toggle("hidden", usage.tier === "paid");
  show(paywallPane);
}

/** 한도에 걸려 잘렸거나 잔여가 0이 된 수집 직후, 결과 화면 안에 업셀 배너를 띄운다. */
function maybeShowResultUpsell(): void {
  if (!usage || usage.tier === "paid") return;
  const clamped = lastMaxItems < lastRequested || usage.remaining <= 0;
  if (!clamped) return;
  resultUpsellText.textContent =
    `오늘 무료 한도 ${usage.limit.toLocaleString()}개를 모두 썼습니다 · 익스텐션 플랜은 ${PAID_PLAN_COPY}`;
  resultUpsell.classList.remove("hidden");
  void reportLimitHit();
}

function renderUsage(): void {
  if (!usage) return;
  const tierLabel = usage.tier === "paid" ? " · 유료 플랜" : usage.authenticated ? " · 무료 계정" : "";
  usageEl.innerHTML = "";
  usageEl.append(`오늘 수집 `, Object.assign(document.createElement("strong"), {
    textContent: `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}개`
  }), ` · 잔여 ${usage.remaining.toLocaleString()}개`, tierLabel);
  usageEl.classList.remove("hidden");
  if (usage.remaining <= 0 && !collectPane.classList.contains("hidden")) showPaywall();
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
    countEl.textContent = collected.length.toLocaleString();
    renderPreview();
    resultUpsell.classList.add("hidden");
    show(resultPane);
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
  const maxItems = clampToRemaining(requested, usage?.remaining ?? COLLECT_HARD_MAX);
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

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
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
      body: JSON.stringify({ source: platform, productUrl: tabUrl, reviews: toReviewRows(collected) })
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
  if (usage && usage.remaining <= 0) {
    showPaywall();
    return;
  }
  progress.classList.add("hidden");
  barFill.style.width = "0%";
  collectBtn.disabled = platform == null;
  show(collectPane);
}

collectBtn.addEventListener("click", startCollect);
el("cancel").addEventListener("click", () => {
  void sendToTab({ type: "COLLECT_CANCEL" }).catch(() => {});
  resetToCollect();
});
el("dl-xlsx").addEventListener("click", () =>
  triggerDownload(
    `reviews_${platform}_${stamp()}.xlsx`,
    reviewsToXlsx(collected),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
);
el("dl-csv").addEventListener("click", () =>
  triggerDownload(`reviews_${platform}_${stamp()}.csv`, reviewsToCsv(collected), "text/csv;charset=utf-8")
);
el("analyze").addEventListener("click", () => void analyze());
el("reset").addEventListener("click", resetToCollect);
el("error-reset").addEventListener("click", resetToCollect);
accountBtn.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl() }));
paywallUpgrade.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl(true) }));
resultUpgrade.addEventListener("click", () => void chrome.tabs.create({ url: connectUrl(true) }));

void init();
void initUsage();
