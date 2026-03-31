import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordPageClient from "@/components/Auth/ResetPasswordPageClient";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";

const record = getRequiredSeoPageRecord("/reset-password");

export const metadata: Metadata = generatePageMetadata(record);

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}
