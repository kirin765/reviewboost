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
    <div className="planGate">
      <div className="planGateContent">{children}</div>
      <div className="planGateOverlay">
        <div className="planGateMessage">
          {featureName}은(는) <strong>{requiredPlan === "pro" ? "Pro" : "Basic"}</strong> 이상에서
          제공됩니다
        </div>
        <Link
          href="/pricing"
          className="btn btnPrimary btnSmall"
        >
          업그레이드하기
        </Link>
      </div>
    </div>
  );
}
