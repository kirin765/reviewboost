import {
  COLLECT_DEFAULT_MAX,
  COLLECT_HARD_MAX,
  RB_ANALYZE_ENDPOINT,
  RB_REPORT_PAGE,
  REPORT_STORAGE_KEY
} from "../lib/config";
import { reviewsToCsv } from "../lib/csv";
import type { ContentRequest, PongResponse, StreamMessage } from "../lib/messages";
import { toReviewRows } from "../lib/normalize";
import type { Platform, RawReview } from "../lib/types";
import { reviewsToXlsx } from "../lib/xlsx";

const el = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node;
};

const collectPane = el("collect-pane");
const resultPane = el("result-pane");
const errorPane = el("error-pane");
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

function show(pane: HTMLElement): void {
  for (const p of [collectPane, resultPane, errorPane]) p.classList.add("hidden");
  pane.classList.remove("hidden");
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
    show(resultPane);
  } else if (msg.type === "ERROR") {
    errorText.textContent = msg.message;
    show(errorPane);
  }
});

function startCollect(): void {
  const raw = Number(maxInput.value);
  const maxItems = Math.max(10, Math.min(COLLECT_HARD_MAX, Number.isFinite(raw) ? raw : COLLECT_DEFAULT_MAX));
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

void init();
