import { extractCoupangProductId } from "../lib/coupang";
import type { ContentRequest, PageContext, PongResponse, StreamMessage } from "../lib/messages";
import { extractSmartstoreProductNo, isSmartstoreHost } from "../lib/smartstore";
import { detectPlatform } from "../lib/platforms";
import { CollectError, type Platform } from "../lib/types";
import { collectCoupang, type RunOptions } from "./collect-coupang";
import { collectSmartstore } from "./collect-smartstore";
import { collect29cm } from "./collect-29cm";
import { collect11st } from "./collect-11st";
import { collectSsg } from "./collect-ssg";
import { collectMusinsa } from "./collect-musinsa";
import { collectOhou } from "./collect-ohou";
import { collectGmarket } from "./collect-gmarket";
import { collectCurly } from "./collect-curly";
import { collectAuction } from "./collect-auction";
import { installReviewCaptureHook } from "./hook";

// 브랜드스토어/스마트스토어에서 페이지가 직접 보내는 리뷰 API 요청을 미리 캡처해 둔다
// (브랜드스토어는 본문 필드명/헤더가 다르므로 페이지의 실제 요청을 재사용하는 게 가장 안전하다).
if (isSmartstoreHost(location.hostname)) {
  installReviewCaptureHook();
}

function detect(): PageContext {
  let platform: Platform | null = null;
  let productId: string | null = null;

  const coupangId = extractCoupangProductId(location.href);
  if (coupangId) {
    platform = "coupang";
    productId = coupangId;
  } else if (isSmartstoreHost(location.hostname)) {
    const no = extractSmartstoreProductNo(location.pathname);
    if (no) {
      platform = "smartstore";
      productId = no;
    }
  } else {
    // 신규 플랫폼 레지스트리 (lib/platforms.ts)
    const hit = detectPlatform(location.href);
    if (hit) {
      platform = hit.platform.key;
      productId = hit.productId;
    }
  }
  return { platform, productId, title: document.title };
}

let cancelled = false;

function broadcast(msg: StreamMessage): void {
  void chrome.runtime.sendMessage(msg).catch(() => {});
}

chrome.runtime.onMessage.addListener((req: ContentRequest, _sender, sendResponse) => {
  if (req.type === "PING") {
    const resp: PongResponse = { type: "PONG", ctx: detect() };
    sendResponse(resp);
    return;
  }
  if (req.type === "COLLECT_CANCEL") {
    cancelled = true;
    sendResponse({ ok: true });
    return;
  }
  if (req.type === "COLLECT_START") {
    cancelled = false;
    void runCollect(req.maxItems);
    sendResponse({ ok: true });
    return;
  }
});

async function runCollect(maxItems: number): Promise<void> {
  const ctx = detect();
  const opts: RunOptions = {
    maxItems,
    onProgress: (collected, total) => broadcast({ type: "PROGRESS", collected, total }),
    shouldCancel: () => cancelled
  };

  try {
    let reviews;
    if (ctx.platform === "coupang" && ctx.productId) {
      reviews = await collectCoupang(ctx.productId, opts);
    } else if (ctx.platform === "smartstore") {
      reviews = await collectSmartstore(opts);
    } else if (ctx.platform === "29cm" && ctx.productId) {
      reviews = await collect29cm(ctx.productId, opts);
    } else if (ctx.platform === "11st" && ctx.productId) {
      reviews = await collect11st(ctx.productId, opts);
    } else if (ctx.platform === "ssg" && ctx.productId) {
      reviews = await collectSsg(ctx.productId, opts);
    } else if (ctx.platform === "musinsa" && ctx.productId) {
      reviews = await collectMusinsa(ctx.productId, opts);
    } else if (ctx.platform === "ohou" && ctx.productId) {
      reviews = await collectOhou(ctx.productId, opts);
    } else if (ctx.platform === "gmarket" && ctx.productId) {
      reviews = await collectGmarket(ctx.productId, opts);
    } else if (ctx.platform === "auction" && ctx.productId) {
      reviews = await collectAuction(ctx.productId, opts);
    } else if (ctx.platform === "curly" && ctx.productId) {
      reviews = await collectCurly(ctx.productId, opts);
    } else {
      // 플랫폼은 인식했지만 수집기가 아직 없는 경우
      throw new CollectError("NOT_PRODUCT", "지원하는 상품 페이지가 아닙니다.");
    }
    if (cancelled) return;
    broadcast({ type: "DONE", reviews });
  } catch (err) {
    const code = err instanceof CollectError ? err.code : "UNKNOWN";
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
    broadcast({ type: "ERROR", code, message });
  }
}
