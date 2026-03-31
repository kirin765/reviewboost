import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";

const record = getRequiredSeoPageRecord("/signup");

export const metadata: Metadata = generatePageMetadata(record);

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
