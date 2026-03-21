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
    <div className="blurGate">
      <div className="blurGateBlur">
        {visibleItems}
      </div>
      <div className="blurGateOverlay">
        <div className="blurGateMessage">
          {t("gate.blurMessage", { feature: featureName, limit: effectiveLimit })}
        </div>
        <Link
          href="/pricing"
          className="btn btnSmall"
        >
          {t("gate.showAll", { extra: totalCount - effectiveLimit })}
        </Link>
      </div>
    </div>
  );
}
