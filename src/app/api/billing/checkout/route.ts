import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { appBaseUrl, isPaddleConfigured, paddlePriceIdForPlan, paddleRequest } from "@/lib/paddle";
import { findPaddleCustomerIdByUserId } from "@/lib/billing";

export const runtime = "nodejs";

type Body = { plan?: "basic" | "pro" };

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerActionClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id || !user.email) {
      return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (!isPaddleConfigured()) {
      return Response.json({ error: "결제 설정이 아직 완료되지 않았습니다." }, { status: 503 });
    }

    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      // empty/non-json body defaults to basic
    }

    const plan = body.plan === "pro" ? "pro" : "basic";

    let priceId: string;
    try {
      priceId = paddlePriceIdForPlan(plan);
    } catch {
      return Response.json({ error: "요금제 가격 ID가 설정되지 않았습니다." }, { status: 500 });
    }

    const baseUrl = appBaseUrl(req);
    const knownCustomerId = await findPaddleCustomerIdByUserId(user.id);

    const checkout = await paddleRequest("/checkouts", {
      method: "POST",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: {
          user_id: user.id,
          plan_tier: plan
        },
        success_url: `${baseUrl}/pricing?billing=success`,
        cancel_url: `${baseUrl}/pricing?billing=cancel`,
        ...(knownCustomerId ? { customer_id: knownCustomerId } : { customer_email: user.email })
      }
    });

    const url = String(checkout?.url ?? "").trim();
    if (!url) {
      return Response.json({ error: "결제 세션 생성에 실패했습니다." }, { status: 500 });
    }

    return Response.json({ url });
  } catch {
    return Response.json({ error: "결제 세션 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
