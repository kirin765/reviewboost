import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateCustomerKey, createPaymentWindow, isTossConfigured } from '@/lib/toss';
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { appBaseUrl, isPaddleConfigured, paddlePriceIdForPlan, paddleRequest } from "@/lib/paddle";
import { findPaddleCustomerIdByUserId } from "@/lib/billing";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { packageId, amount, orderName } = body;

    // Get or create Toss customer key
    const { data: profile } = await supabase
      .from('profiles')
      .select('toss_customer_key')
      .eq('user_id', user.id)
      .single();

    let customerKey = profile?.toss_customer_key;
    if (!customerKey) {
      customerKey = generateCustomerKey(user.id);
      await supabase
        .from('profiles')
        .update({ toss_customer_key: customerKey })
        .eq('user_id', user.id);
    }

    if (!isTossConfigured()) {
      return NextResponse.json({ error: '결제 시스템이 설정되지 않았습니다.' }, { status: 500 });
    }

    // Create payment
    const orderId = `order_${Date.now()}_${user.id.slice(0, 8)}`;
    const paymentData = await createPaymentWindow({
      customerKey,
      amount,
      orderId,
      orderName: orderName || '크레딧 구매',
    });

    // Store pending payment
    await supabase.from('payments').insert({
      user_id: user.id,
      toss_order_id: orderId,
      amount,
      status: 'pending',
    });

    return NextResponse.json({
      checkoutUrl: paymentData.checkout?.url,
      orderId,
    });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: '결제 생성 실패' }, { status: 500 });
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

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
