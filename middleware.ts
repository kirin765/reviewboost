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
  "/api/capabilities(.*)",
  "/api/billing/checkout(.*)",
  "/api/billing/credits(.*)"
  // NOTE: /api/billing/webhook 는 공개 — Paddle 서명검증으로 보호
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
    await auth.protect();
  }

  return withSecurity(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sample\\.csv|sample_simple\\.csv).*)"]
};
