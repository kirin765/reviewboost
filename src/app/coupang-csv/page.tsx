import React from "react";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import CoupangCsvDownloadTool from "@/components/features/coupang/CoupangCsvDownloadTool";
import { ShellContainer } from "@/components/ui/Primitives";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const coupangCsvRecord = getRequiredSeoPageRecord("/coupang-csv");

export const metadata: Metadata = generatePageMetadata(coupangCsvRecord);

export default function CoupangCsvPage() {
  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <StructuredData data={createWebPageStructuredData(coupangCsvRecord)} />
      <ShellContainer className="max-w-[960px]">
        <CoupangCsvDownloadTool />
      </ShellContainer>
    </main>
  );
}
