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
    <div className="relative overflow-hidden rounded-[16px] border border-white/10">
      <div className="opacity-35 blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-[rgba(9,11,13,0.72)] backdrop-blur-sm">
        <div className="flex max-w-sm flex-col items-center gap-4 px-6 text-center">
          <div className="text-sm leading-6 text-[var(--color-text)]/88">
          {t("gate.planRequired", { feature: featureName, plan: planLabel })}
          </div>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-[12px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
        >
          {t("gate.upgrade")}
        </Link>
        </div>
      </div>
    </div>
  );
}
