import type { Metadata } from "next";
import CoupangCsvDownloadTool from "@/components/features/coupang/CoupangCsvDownloadTool";

export const metadata: Metadata = {
  title: "쿠팡·스마트스토어 리뷰 크롤링 - ReviewBoost",
  description: "쿠팡 또는 스마트스토어 상품 URL을 입력하면 리뷰 CSV를 다운로드할 수 있습니다.",
  alternates: { canonical: "/coupang-csv" }
};

export default function CoupangCsvPage() {
  return (
    <main className="pageMain pageNarrow">
      <CoupangCsvDownloadTool />
    </main>
  );
}
