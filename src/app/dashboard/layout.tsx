import type { ReactNode } from "react";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getCapabilitiesBase } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { supabaseConfigured } = getCapabilitiesBase();
  let userEmail: string | null = null;

  try {
    if (supabaseConfigured) {
      const supabase = await createSupabaseServerComponentClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? null;
    }
  } catch {
    // keep unauthenticated for non-auth environments
  }

  return <DashboardShell userEmail={userEmail}>{children}</DashboardShell>;
}
