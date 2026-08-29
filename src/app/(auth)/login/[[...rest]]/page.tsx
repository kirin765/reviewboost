import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";
import SocialLoginButtons from "@/components/Auth/SocialLoginButtons";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignIn signUpUrl="/signup" />
      <Suspense fallback={null}>
        <SocialLoginButtons />
      </Suspense>
    </div>
  );
}
