"use client";

import * as React from "react";
import type { PlanGates, PlanTier } from "@/lib/types";
import { getGatesForPlan } from "@/lib/plan_gates";
import { devForcedPlan } from "@/lib/dev_flags";

type PlanContextValue = {
  gates: PlanGates;
  plan: PlanTier;
};

const PlanContext = React.createContext<PlanContextValue | null>(null);

export function PlanProvider({
  children,
  plan
}: {
  children: React.ReactNode;
  plan: PlanTier;
}) {
  const forcedPlan = devForcedPlan();
  const effectivePlan = forcedPlan ?? plan;

  const value = React.useMemo(() => ({
    gates: getGatesForPlan(effectivePlan),
    plan: effectivePlan,
  }), [effectivePlan]);

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return ctx;
}

export function useGates() {
  const ctx = React.useContext(PlanContext);
  if (!ctx) {
    throw new Error("useGates must be used within PlanProvider");
  }
  return ctx.gates;
}
