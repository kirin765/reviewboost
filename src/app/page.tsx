import React, { Suspense } from "react";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import HomePageContent from "@/components/home/HomePageContent";
import HomePageStatus from "@/components/home/HomePageStatus";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createExtensionStructuredData } from "@/lib/seo/structured-data";

const homeRecord = getRequiredSeoPageRecord("/");
export const metadata: Metadata = generatePageMetadata(homeRecord);

export default function HomePage() {
  return (
    <main className="pageMain marketingPage">
      <StructuredData data={createExtensionStructuredData(homeRecord)} />
      <Suspense fallback={null}>
        <HomePageStatus />
      </Suspense>
      <HomePageContent />
    </main>
  );
}
