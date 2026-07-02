import React from "react";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import PricingContent from "@/components/PricingContent";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createPricingStructuredData } from "@/lib/seo/structured-data";

const pricingRecord = getRequiredSeoPageRecord("/pricing");

export const metadata: Metadata = generatePageMetadata(pricingRecord);

export default function PricingPage() {
  return (
    <>
      <StructuredData data={createPricingStructuredData(pricingRecord)} />
      <PricingContent />
    </>
  );
}
