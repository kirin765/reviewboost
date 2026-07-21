import { Suspense } from "react";
import type { Metadata } from "next";
import ExtensionConnectClient from "@/components/extension/ExtensionConnectClient";

export const metadata: Metadata = {
  title: "익스텐션 계정 연결 | ReviewBoost",
  description: "ReviewBoost 리뷰 수집기 익스텐션을 계정과 연결하고 수집 한도를 관리합니다.",
  robots: { index: false, follow: false }
};

export default function ExtensionConnectPage() {
  return (
    <Suspense fallback={<main className="pageMain" style={{ padding: "48px 16px" }} />}>
      <ExtensionConnectClient />
    </Suspense>
  );
}
