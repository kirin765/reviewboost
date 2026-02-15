"use client";

import Link from "next/link";
import { useGates } from "@/contexts/PlanContext";
import type { ReactNode } from "react";

type PlanGateProps = {
  children: ReactNode;
  requiredPlan: "basic" | "pro";
  featureName: string;
};

export default function PlanGate({ children, requiredPlan, featureName }: PlanGateProps) {
  const gates = useGates();

  const hasAccess =
    requiredPlan === "pro"
      ? gates.plan === "pro"
      : gates.plan === "basic" || gates.plan === "pro";

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        position: "relative",
        padding: "24px",
        borderRadius: 8,
        background: "var(--color-bg-soft, #f5f5f5)",
        textAlign: "center",
        border: "1px dashed var(--color-border, #ccc)",
      }}
    >
      <div style={{ opacity: 0.6 }}>{children}</div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.85)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: "var(--color-muted)",
            marginBottom: 8,
          }}
        >
          {featureName}은(는) <strong>{requiredPlan === "pro" ? "Pro" : "Basic"}</strong> 이상에서
          제공됩니다
        </div>
        <Link
          href="/pricing"
          className="btn btnPrimary"
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          업그레이드하기
        </Link>
      </div>
    </div>
  );
}
