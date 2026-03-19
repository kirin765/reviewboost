import type { ReactNode } from "react";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import { getNavigationSessionState } from "@/lib/navigation_session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getNavigationSessionState();
  return <DashboardShell userEmail={session.userEmail} plan={session.plan}>{children}</DashboardShell>;
}
