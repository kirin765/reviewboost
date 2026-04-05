import type { Metadata } from "next";
import CoupangCsvDownloadTool from "@/components/features/coupang/CoupangCsvDownloadTool";
import CoupangSellerProductListTool from "@/components/features/coupang/CoupangSellerProductListTool";

export const metadata: Metadata = {
  title: "스토어 리뷰 CSV 다운로드 - ReviewBoost",
  description: "쿠팡 또는 스마트스토어 상품 URL 리뷰 CSV 다운로드와 쿠팡 등록상품 목록 조회를 제공합니다.",
  alternates: { canonical: "/coupang-csv" }
};

export default function CoupangCsvPage() {
  return (
    <main>
      <CoupangCsvDownloadTool />
      <CoupangSellerProductListTool />
    </main>
  );
}
