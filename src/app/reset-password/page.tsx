import { Suspense } from "react";
import ResetPasswordPageClient from "@/components/Auth/ResetPasswordPageClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}
