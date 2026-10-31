import { NextResponse, type NextRequest } from "next/server";
import { recordFunnelEvent } from "@/lib/db/queries";
import { resolveGoLink } from "@/lib/go-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 방문자 식별 쿠키(1st-party, 무작위 UUID). 개인정보가 아니라 중복 클릭 집계용. */
const VISITOR_COOKIE = "rb_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GA4 유입 파라미터와 같은 이름만 목적지로 넘긴다(값은 안전한 문자만). */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const UTM_VALUE_RE = /^[\p{L}\p{N}_.() /-]{1,100}$/u;

/** 링크 미리보기·크롤러 요청은 리디렉션은 하되 클릭 집계에서 표시해 걸러낼 수 있게 한다. */
const BOT_UA_RE =
  /bot|crawler|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|bingpreview|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|twitterbot|curl|wget|headless/i;

function noStoreHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    "cache-control": "no-store, max-age=0",
    "x-robots-tag": "noindex, nofollow",
    ...extra
  };
}

function readVisitorId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(VISITOR_COOKIE)?.value.trim() ?? "";
  if (UUID_RE.test(existing)) return { id: existing.toLowerCase(), isNew: false };
  return { id: crypto.randomUUID(), isNew: true };
}

/** 쿼리스트링의 UTM 만 목적지 URL 에 붙인다. 형식이 이상하면 조용히 버린다. */
function destinationWithUtm(destination: string, req: NextRequest): string {
  const url = new URL(destination);
  for (const key of UTM_KEYS) {
    const value = req.nextUrl.searchParams.get(key)?.trim() ?? "";
    if (value && UTM_VALUE_RE.test(value)) url.searchParams.set(key, value);
  }
  return url.toString();
}

function refererPath(req: NextRequest): string | null {
  const raw = req.headers.get("referer");
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // 전체 referer(쿼리 포함)는 남기지 않는다 — 토큰·검색어 유출 방지.
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await ctx.params;
  const link = resolveGoLink(slug);
  if (!link) {
    return new NextResponse("Not found", { status: 404, headers: noStoreHeaders() });
  }

  const visitor = readVisitorId(req);
  const userAgent = req.headers.get("user-agent") ?? "";
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = req.nextUrl.searchParams.get(key)?.trim() ?? "";
    if (value && UTM_VALUE_RE.test(value)) utm[key] = value;
  }

  // 계측 실패가 리디렉션을 막으면 안 된다.
  try {
    await recordFunnelEvent("outbound_click", null, {
      slug: link.slug,
      campaign: link.campaign,
      destination: link.destination,
      referer: refererPath(req),
      utm: Object.keys(utm).length > 0 ? utm : null,
      isBot: BOT_UA_RE.test(userAgent),
      visitorId: visitor.id
    });
  } catch {
    // ignore
  }

  const res = NextResponse.redirect(destinationWithUtm(link.destination, req), 302);
  res.headers.set("cache-control", "no-store, max-age=0");
  res.headers.set("x-robots-tag", "noindex, nofollow");
  res.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (visitor.isNew) {
    res.cookies.set({
      name: VISITOR_COOKIE,
      value: visitor.id,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: VISITOR_MAX_AGE
    });
  }
  return res;
}
