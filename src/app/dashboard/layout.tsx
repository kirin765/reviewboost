import type { Metadata } from "next";
import type { ReactNode } from "react";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";

export const dynamic = "force-dynamic";

const record = getRequiredSeoPageRecord("/dashboard");

export const metadata: Metadata = generatePageMetadata(record);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
