import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignUp signInUrl="/login" />
    </div>
  );
}
