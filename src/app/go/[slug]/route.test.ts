import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  recordFunnelEvent: vi.fn()
}));

vi.mock("@/lib/db/queries", () => ({ recordFunnelEvent: mocks.recordFunnelEvent }));

const ORIGIN = "https://reviewboost.co.kr";
const SLUG = "reviewisa-cafe24-story-20261031";
const STORE = "https://store.cafe24.com/kr/apps/43542";
const VISITOR = "8f2f3d1a-1111-4b2c-9abc-0123456789ab";

function goRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, { headers });
}

function context(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recordFunnelEvent.mockResolvedValue(undefined);
});

describe("GET /go/[slug]", () => {
  it("redirects a registered slug to the app store and records the click", async () => {
    const res = await GET(goRequest(`/go/${SLUG}`), context(SLUG));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(STORE);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("outbound_click", null, {
      slug: SLUG,
      campaign: "reviewisa-cafe24",
      destination: STORE,
      referer: null,
      utm: null,
      isBot: false,
      visitorId: expect.stringMatching(/^[0-9a-f-]{36}$/)
    });
  });

  it("sets a first-party visitor cookie on the first visit and reuses it afterwards", async () => {
    const first = await GET(goRequest(`/go/${SLUG}`), context(SLUG));
    const cookie = first.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("rb_vid=");
    expect(cookie).toContain("HttpOnly");
    const visitorId = cookie.match(/rb_vid=([0-9a-f-]{36})/)?.[1];
    expect(visitorId).toBeTruthy();

    const second = await GET(goRequest(`/go/${SLUG}`, { cookie: `rb_vid=${VISITOR}` }), context(SLUG));
    expect(second.headers.get("set-cookie")).toBeNull();
    expect(mocks.recordFunnelEvent).toHaveBeenLastCalledWith(
      "outbound_click",
      null,
      expect.objectContaining({ visitorId: VISITOR })
    );
  });

  it("forwards only safe utm parameters and keeps the referer path without its query", async () => {
    const res = await GET(
      goRequest(`/go/${SLUG}?utm_source=naver&utm_campaign=${encodeURIComponent("스토리 글")}&utm_content=<script>`, {
        referer: `${ORIGIN}/help/smartstore-review-csv-export?email=a@b.com`
      }),
      context(SLUG)
    );

    const location = new URL(res.headers.get("location") ?? "");
    expect(location.searchParams.get("utm_source")).toBe("naver");
    expect(location.searchParams.get("utm_campaign")).toBe("스토리 글");
    expect(location.searchParams.get("utm_content")).toBeNull();
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "outbound_click",
      null,
      expect.objectContaining({
        referer: `${ORIGIN}/help/smartstore-review-csv-export`,
        utm: { utm_source: "naver", utm_campaign: "스토리 글" }
      })
    );
  });

  it("flags link-preview and crawler user agents as bots but still redirects", async () => {
    const res = await GET(
      goRequest(`/go/${SLUG}`, { "user-agent": "facebookexternalhit/1.1" }),
      context(SLUG)
    );

    expect(res.status).toBe(302);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "outbound_click",
      null,
      expect.objectContaining({ isBot: true })
    );
  });

  it("normalizes the slug case", async () => {
    const res = await GET(goRequest(`/go/${SLUG.toUpperCase()}`), context(SLUG.toUpperCase()));
    expect(res.status).toBe(302);
  });

  it("returns 404 for unregistered or malformed slugs without redirecting", async () => {
    for (const slug of ["unknown-story", "a/../../etc/passwd", "", "-leading", "x".repeat(81)]) {
      const res = await GET(goRequest("/go/x"), context(slug));
      expect(res.status).toBe(404);
      expect(res.headers.get("location")).toBeNull();
    }
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("still redirects when the click record fails", async () => {
    mocks.recordFunnelEvent.mockRejectedValue(new Error("db down"));
    const res = await GET(goRequest(`/go/${SLUG}`), context(SLUG));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(STORE);
  });
});
