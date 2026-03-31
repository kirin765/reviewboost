import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";

const record = getRequiredSeoPageRecord("/forgot-password");

export const metadata: Metadata = generatePageMetadata(record);

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
