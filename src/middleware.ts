import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { applySecurityHeaders } from "@/lib/security";

function withSecurity(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/analyze(.*)",
  "/api/report(.*)",
  "/api/capabilities(.*)"
  // NOTE: /api/billing/webhook 는 공개 — Paddle 서명검증으로 보호
  // NOTE: /api/billing/checkout 는 공개 — 게스트(비로그인) 결제 허용.
  //       라우트 내부에서 auth() 로 로그인 사용자를 구분하고 CSRF(동일 출처)로 보호한다.
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  if (request.nextUrl.pathname === "/term") {
    const url = request.nextUrl.clone();
    url.pathname = "/terms";
    return withSecurity(NextResponse.redirect(url, 301));
  }

  if (request.nextUrl.pathname === "/help-checklist") {
    const url = request.nextUrl.clone();
    url.pathname = "/help/csv-checklist";
    return withSecurity(NextResponse.redirect(url, 301));
  }

  if (isProtectedRoute(request) && process.env.CLERK_SECRET_KEY) {
    const { userId } = await auth();
    if (!userId) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return withSecurity(new NextResponse("Unauthorized", { status: 401 }));
      }
      const signInUrl = new URL("/login", request.url);
      signInUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return withSecurity(NextResponse.redirect(signInUrl));
    }
  }

  return withSecurity(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sample\\.csv|sample_simple\\.csv).*)"]
};
