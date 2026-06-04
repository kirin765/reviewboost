import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignIn signUpUrl="/signup" />
    </div>
  );
}
