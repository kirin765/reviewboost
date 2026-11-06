import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import SocialLoginButtons from "@/components/Auth/SocialLoginButtons";
import { safeInternalPath } from "@/lib/social_auth";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  // `next`(앱 내부 경로) 또는 Clerk 표준 `redirect_url` 중 안전한 상대 경로만 사용한다.
  const next =
    safeInternalPath(typeof params.next === "string" ? params.next : null) ??
    safeInternalPath(typeof params.redirect_url === "string" ? params.redirect_url : null);
  const signUpUrl = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div className="mx-auto max-w-md py-12">
      <SignIn signUpUrl={signUpUrl} forceRedirectUrl={next ?? undefined} />
      <Suspense fallback={null}>
        <SocialLoginButtons />
      </Suspense>
    </div>
  );
}
