import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import SocialLoginButtons from "@/components/Auth/SocialLoginButtons";
import { safeInternalPath } from "@/lib/social_auth";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  // 게스트 결제 후 익스텐션 연결 페이지처럼 `next`가 있으면 가입 직후 그 화면으로 돌아가
  // pending 구독 claim(자동 연결)이 이어지게 한다. 없으면 기존 대시보드 유도 유지.
  const next = safeInternalPath(typeof params.next === "string" ? params.next : null);
  const signInUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="mx-auto max-w-md py-12">
      <SignUp signInUrl={signInUrl} forceRedirectUrl={next ?? "/dashboard?signup_success=1"} />
      <Suspense fallback={null}>
        <SocialLoginButtons signup />
      </Suspense>
    </div>
  );
}
