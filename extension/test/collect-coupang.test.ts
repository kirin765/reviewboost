import { afterEach, describe, expect, it, vi } from "vitest";
import { collectCoupang } from "../src/content/collect-coupang";
import { reviewToOfficialRow } from "../src/lib/excel-form";
import { toReviewRows } from "../src/lib/normalize";

vi.mock("../src/lib/collector", async (original) => ({
  ...await original<typeof import("../src/lib/collector")>(),
  realSleep: async () => {}
}));
afterEach(() => vi.unstubAllGlobals());

describe("Coupang collection preserves exportable reviews", () => {
  it("keeps body, title-only and rating-only entries in downloads", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      rData: { paging: { totalPage: 1, totalCount: 3, contents: [
        { content: "본문", rating: 5 }, { content: "", title: "맛있어요", rating: 4 },
        { content: "", rating: 3 }
      ] } }
    }), { headers: { "content-type": "application/json" } })));
    const reviews = await collectCoupang("123", { maxItems: 10 });
    expect(reviews).toHaveLength(3);
    expect(reviews.map(r => reviewToOfficialRow(r)[5])).toEqual(["본문", "맛있어요", ""]);
    expect(reviews.map(r => reviewToOfficialRow(r)[3])).toEqual(["5", "4", "3"]);
    expect(toReviewRows(reviews).map(r => r.text)).toEqual(["본문", "맛있어요"]);
  });
});

const response = (contents: unknown[], totalCount: number, totalPage: number) =>
  new Response(JSON.stringify({ rData: { paging: { contents, totalCount, totalPage } } }), {
    headers: { "content-type": "application/json" }
  });

describe("Coupang partial collection reporting", () => {
  it("retains the original total when a later page reports zero and returns no rows", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response([{ rating: 5 }, { title: "좋아요", rating: 4 }], 1667, 167))
      .mockResolvedValueOnce(response([], 0, 0));
    vi.stubGlobal("fetch", fetch);
    const onSummary = vi.fn();
    const reviews = await collectCoupang("123", { maxItems: 1667, onSummary });
    expect(reviews).toHaveLength(2);
    expect(onSummary).toHaveBeenCalledWith({ reportedTotal: 1667, requested: 1667, collected: 2, textReviews: 1, partial: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not call a requested subset incomplete", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([{ rating: 5 }, { rating: 4 }], 1667, 167)));
    const onSummary = vi.fn();
    expect(await collectCoupang("123", { maxItems: 1, onSummary })).toHaveLength(1);
    expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 1, partial: false }));
  });
  it("does not call a naturally smaller product incomplete", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response([{ rating: 5 }], 1, 1)));
    const onSummary = vi.fn();
    await collectCoupang("123", { maxItems: 1667, onSummary });
    expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ partial: false }));
  });
  it("rejects malformed responses rather than treating them as the end of reviews", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{}", { headers: { "content-type": "application/json" } })));
    await expect(collectCoupang("123", { maxItems: 10 })).rejects.toMatchObject({ code: "UNSUPPORTED" });
  });
});

it("recovers reviews beyond a truncated sort and counts overlapping IDs only once", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(response([{ reviewId: 1, content: "동일 내용", rating: 5 }, { reviewId: 2, rating: 3 }], 3, 2))
    .mockResolvedValueOnce(response([], 0, 0))
    .mockResolvedValueOnce(response([{ reviewId: 2, rating: 3 }, { reviewId: 3, content: "동일 내용", rating: 5 }], 3, 2));
  vi.stubGlobal("fetch", fetch);
  const onSummary = vi.fn();
  const reviews = await collectCoupang("123", { maxItems: 3, onSummary });
  expect(reviews).toHaveLength(3);
  expect(reviews.map(r => r.rating)).toEqual([5, 3, 5]);
  expect(new URL(fetch.mock.calls[2][0], "https://www.coupang.com").searchParams.get("sortBy")).toBe("DATE_DESC");
  expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 3, partial: false }));
});

it("uses rating filters if both overall sort orders still omit reviews", async () => {
  const fetch = vi.fn(async (url: string) => {
    const q = new URL(url, "https://www.coupang.com").searchParams;
    if (q.get("ratings") === "1") return response([{ reviewId: 2, rating: 1 }], 2, 1);
    return response([{ reviewId: 1, rating: 5 }], 2, 1);
  });
  vi.stubGlobal("fetch", fetch);
  const onSummary = vi.fn();
  expect(await collectCoupang("123", { maxItems: 2, onSummary })).toHaveLength(2);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 2, partial: false }));
});

it("continues through overlap-only pages and stops at the unique requested count", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(response([{ reviewId: 1, rating: 5 }], 3, 1))
    .mockResolvedValueOnce(response([{ reviewId: 1, rating: 5 }], 3, 3))
    .mockResolvedValueOnce(response([{ reviewId: 2, rating: 4 }, { reviewId: 3, rating: 3 }], 3, 3));
  vi.stubGlobal("fetch", fetch);
  const progress = vi.fn();
  expect(await collectCoupang("123", { maxItems: 3, onProgress: progress })).toHaveLength(3);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(progress.mock.calls.map(call => call[0])).toEqual([1, 1, 3]);
});

it("retains a partial result if no alternate view exposes the missing ID", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => response([{ reviewId: 1, rating: 5 }], 2, 1)));
  const onSummary = vi.fn();
  expect(await collectCoupang("123", { maxItems: 2, onSummary })).toHaveLength(1);
  expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ partial: true }));
});

it("keeps reviews collected before an alternate view is blocked", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(response([{ reviewId: 1, content: "본문", rating: 5 }], 3, 1))
    .mockResolvedValueOnce(new Response("", { status: 403 }));
  vi.stubGlobal("fetch", fetch);
  const onSummary = vi.fn();
  const reviews = await collectCoupang("123", { maxItems: 3, onSummary });
  expect(reviews).toHaveLength(1);
  expect(reviews[0].text).toBe("본문");
  expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 1, partial: true }));
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("does not start recovery after cancellation", async () => {
  let cancelled = false;
  const fetch = vi.fn(async () => { cancelled = true; return response([{ reviewId: 1, rating: 5 }], 2, 1); });
  vi.stubGlobal("fetch", fetch);
  await collectCoupang("123", { maxItems: 2, shouldCancel: () => cancelled });
  expect(fetch).toHaveBeenCalledTimes(1);
});
