import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CoupangCredentialForm from "@/components/features/coupang/CoupangCredentialForm";
import { Eyebrow } from "@/components/marketing/MarketingPrimitives";

export const dynamic = "force-dynamic";

export default async function DashboardCoupangIntegrationPage() {
  const supabase = await createSupabaseServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="pb-16">
      <section className="max-w-[760px]">
        <Eyebrow>Coupang Integration</Eyebrow>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.96]">쿠팡 Open API 연동 정보를 저장합니다</h1>
        <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
          각 사용자가 본인 쿠팡 Wing에서 발급받은 `vendorId`, `accessKey`, `secretKey`를 등록합니다. 저장 후 상품 목록 조회에서 자동으로 사용됩니다.
        </p>
      </section>
      <CoupangCredentialForm />
    </main>
  );
}
