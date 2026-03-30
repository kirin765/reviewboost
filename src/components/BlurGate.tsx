"use client";

import React from "react";
import Link from "next/link";
import { useGates } from "@/contexts/PlanContext";
import { useTranslation } from "@/lib/i18n";
import type { ReactNode } from "react";

type BlurGateProps = {
  children: ReactNode;
  visibleCount: number;
  totalCount: number;
  featureName: string;
  requiredPlan?: "basic" | "pro";
};

export default function BlurGate({
  children,
  visibleCount,
  totalCount,
  featureName,
  requiredPlan = "basic",
}: BlurGateProps) {
  const gates = useGates();
  const { t } = useTranslation();

  const effectiveLimit =
    featureName === "부정 키워드"
      ? gates.negativeKeywordVisibleCount
      : featureName === "긴급 대응"
      ? gates.urgentReviewVisibleCount
      : gates.actionItemVisibleCount;

  const showFull =
    gates.plan === "pro" ||
    (gates.plan === "basic" && requiredPlan !== "pro");

  if (showFull || totalCount <= effectiveLimit) {
    return <>{children}</>;
  }

  const visibleItems = Array.isArray(children)
    ? children.slice(0, effectiveLimit)
    : children;

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-white/10">
      <div className="opacity-40 blur-[2px]">
        {visibleItems}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,11,13,0.7)] backdrop-blur-sm">
        <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
          <div className="text-sm leading-6 text-[var(--color-text)]/88">
          {t("gate.blurMessage", { feature: featureName, limit: effectiveLimit })}
          </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-[12px] border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--color-text)]"
        >
          {t("gate.showAll", { extra: totalCount - effectiveLimit })}
        </Link>
        </div>
      </div>
    </div>
  );
}
