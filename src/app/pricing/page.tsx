import React from "react";
import type { Metadata } from "next";
import PricingContent from "@/components/PricingContent";

export const metadata: Metadata = {
  title: "요금제 - ReviewBoost AI 리뷰 분석 플랜 비교",
  description: "ReviewBoost 무료·Basic·Pro 플랜을 비교하세요. 월 100회 무료 분석부터 대량 리뷰 분석까지, 이커머스 셀러에 맞는 요금제를 선택하세요.",
  alternates: { canonical: "/pricing" }
};
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { paddlePriceIdForPlan } from "@/lib/paddle";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ billing?: string; [key: string]: string | string[] | undefined }>;
}) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  const safePlanPriceId = (plan: "basic" | "pro") => {
    try {
      return paddlePriceIdForPlan(plan);
    } catch {
      return undefined;
    }
  };

  try {
    const supabase = await createSupabaseServerComponentClient();
    const result = await supabase.auth.getUser();
    userId = result?.data?.user?.id ?? null;
    userEmail = result?.data?.user?.email ?? null;
  } catch {
    // ignore and keep unauthenticated state
  }

  const basicPriceId = safePlanPriceId("basic");
  const proPriceId = safePlanPriceId("pro");
  const billing = (await searchParams)?.billing;
  return <PricingContent userId={userId} userEmail={userEmail} basicPriceId={basicPriceId} proPriceId={proPriceId} billing={billing} />;
}
