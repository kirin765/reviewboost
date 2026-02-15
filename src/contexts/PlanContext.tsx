"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PlanGates, PlanTier } from "@/lib/types";
import { getGatesForPlan } from "@/lib/plan_gates";
import { devForcedPlan } from "@/lib/dev_flags";

type PlanContextValue = {
  gates: PlanGates;
  plan: PlanTier;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  children,
  plan
}: {
  children: ReactNode;
  plan: PlanTier;
}) {
  const forcedPlan = devForcedPlan();
  const effectivePlan = forcedPlan ?? plan;

  const value = useMemo(() => ({
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
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within PlanProvider");
  }
  return ctx;
}

export function useGates() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("useGates must be used within PlanProvider");
  }
  return ctx.gates;
}
