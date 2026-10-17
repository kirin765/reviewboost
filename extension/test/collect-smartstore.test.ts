// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/collector", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/collector")>(),
  realSleep: vi.fn().mockResolvedValue(undefined)
}));

import { collectSmartstore } from "../src/content/collect-smartstore";

const CAPTURE_ATTR = "data-rb-review-capture";

/** 페이지가 보낸 리뷰 요청을 재현해 resolveRequest 가 캡처 경로로 즉시 반환하게 한다. */
function seedCapturedRequest(): void {
  document.documentElement.setAttribute(
    CAPTURE_ATTR,
    JSON.stringify({
      url: "https://smartstore.naver.com/i/v1/contents/reviews/query-pages",
      method: "POST",
      body: JSON.stringify({
        checkoutMerchantNo: 520014391,
        originProductNo: 13089995455,
        page: 1,
        pageSize: 20,
        reviewSearchSortType: "REVIEW_RANKING"
      }),
      headers: { "content-type": "application/json" }
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute(CAPTURE_ATTR);
});

describe("Smart Store collection", () => {
  it.each([
    [403, "BLOCKED"],
    [429, "BLOCKED"],
    [500, "UNSUPPORTED"]
  ])("maps HTTP %s without retrying the request", async (status, code) => {
    vi.stubGlobal("location", {
      pathname: "/store/products/13089995455",
      hostname: "smartstore.naver.com",
      origin: "https://smartstore.naver.com"
    });
    seedCapturedRequest();
    const fetch = vi.fn().mockResolvedValue(new Response('{"error":"rate limited"}', { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(collectSmartstore({ maxItems: 20 })).rejects.toMatchObject({ code });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("explains the 429 rate limit instead of surfacing the raw status", async () => {
    vi.stubGlobal("location", {
      pathname: "/store/products/13089995455",
      hostname: "smartstore.naver.com",
      origin: "https://smartstore.naver.com"
    });
    seedCapturedRequest();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 429 })));
    await expect(collectSmartstore({ maxItems: 20 })).rejects.toMatchObject({
      code: "BLOCKED",
      message: expect.stringContaining("제한")
    });
  });

  it("keeps reviews without body text (별점만 리뷰도 수집·내보내기에 포함)", async () => {
    vi.stubGlobal("location", {
      pathname: "/store/products/13089995455",
      hostname: "smartstore.naver.com",
      origin: "https://smartstore.naver.com"
    });
    seedCapturedRequest();
    const page = {
      contents: [
        { reviewContent: "좋아요", reviewScore: 5, createDate: "2026-01-01" },
        { reviewContent: "", reviewScore: 4, createDate: "2026-01-02" }
      ],
      totalElements: 2,
      totalPages: 1
    };
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page), { status: 200, headers: { "content-type": "application/json" } })
    );
    vi.stubGlobal("fetch", fetch);
    const reviews = await collectSmartstore({ maxItems: 20 });
    expect(reviews).toHaveLength(2);
    expect(reviews[0].text).toBe("좋아요");
    expect(reviews[1].text).toBe("");
    expect(reviews[1].rating).toBe(4);
  });
});
