import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";
import SocialLoginButtons from "@/components/Auth/SocialLoginButtons";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignUp signInUrl="/login" />
      <Suspense fallback={null}>
        <SocialLoginButtons signup />
      </Suspense>
    </div>
  );
}
