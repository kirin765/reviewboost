export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Dashboard itself should be usable without accounts.
  // Saved history/detail pages still require login when Supabase is configured.
  return <>{children}</>;
}
