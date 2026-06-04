import React from "react";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import PricingContent from "@/components/PricingContent";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createPricingStructuredData } from "@/lib/seo/structured-data";
import { auth } from "@clerk/nextjs/server";

const pricingRecord = getRequiredSeoPageRecord("/pricing");

export const metadata: Metadata = generatePageMetadata(pricingRecord);

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ billing?: string; [key: string]: string | string[] | undefined }>;
}) {
  let userId: string | null = null;

  try {
    if (process.env.CLERK_SECRET_KEY) {
      const result = await auth();
      userId = result.userId ?? null;
    }
  } catch {
    // ignore and keep unauthenticated state
  }

  const billing = (await searchParams)?.billing;

  return (
    <>
      <StructuredData data={createPricingStructuredData(pricingRecord)} />
      <PricingContent userId={userId} billing={billing} />
    </>
  );
}
