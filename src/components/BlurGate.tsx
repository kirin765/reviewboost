"use client";

import Link from "next/link";
import { useGates } from "@/contexts/PlanContext";
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
    <div style={{ position: "relative" }}>
      <div style={{ opacity: 0.3, filter: "blur(4px)", userSelect: "none" }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          background: "linear-gradient(transparent, rgba(255,255,255,0.9))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "var(--color-muted)",
            marginBottom: 8,
          }}
        >
          {featureName} {effectiveLimit}개만 보기 가능
        </div>
        <Link
          href="/pricing"
          className="btn"
          style={{ fontSize: 12, padding: "6px 12px" }}
        >
          전체 보기 ({totalCount - effectiveLimit}개 더)
        </Link>
      </div>
    </div>
  );
}
