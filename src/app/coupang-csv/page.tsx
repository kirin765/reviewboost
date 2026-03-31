import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import CoupangCsvDownloadTool from "@/components/features/coupang/CoupangCsvDownloadTool";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const coupangCsvRecord = getRequiredSeoPageRecord("/coupang-csv");

export const metadata: Metadata = generatePageMetadata(coupangCsvRecord);

export default function CoupangCsvPage() {
  return (
    <main className="pageMain pageNarrow">
      <StructuredData data={createWebPageStructuredData(coupangCsvRecord)} />
      <CoupangCsvDownloadTool />
    </main>
  );
}
