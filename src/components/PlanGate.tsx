"use client";

import React from "react";
import Link from "next/link";
import { useGates } from "@/contexts/PlanContext";
import { useTranslation } from "@/lib/i18n";
import type { ReactNode } from "react";

type PlanGateProps = {
  children: ReactNode;
  requiredPlan: "basic" | "pro";
  featureName: string;
};

export default function PlanGate({ children, requiredPlan, featureName }: PlanGateProps) {
  const gates = useGates();
  const { t } = useTranslation();

  const hasAccess =
    requiredPlan === "pro"
      ? gates.plan === "pro"
      : gates.plan === "basic" || gates.plan === "pro";

  if (hasAccess) {
    return <>{children}</>;
  }

  const planLabel = requiredPlan === "pro" ? "Pro" : "Basic";

  return (
    <div className="planGate">
      <div className="planGateContent">{children}</div>
      <div className="planGateOverlay">
        <div className="planGateMessage">
          {t("gate.planRequired", { feature: featureName, plan: planLabel })}
        </div>
        <Link
          href="/pricing"
          className="btn btnPrimary btnSmall"
        >
          {t("gate.upgrade")}
        </Link>
      </div>
    </div>
  );
}
