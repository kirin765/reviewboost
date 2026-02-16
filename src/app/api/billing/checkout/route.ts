import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateCustomerKey, createPaymentWindow, isTossConfigured } from '@/lib/toss';

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
  }
}
