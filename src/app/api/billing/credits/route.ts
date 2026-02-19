import { NextResponse } from "next/server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { logApiError } from "@/lib/api_log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerActionClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    // Get credit balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get credit packages
    const { data: packages } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    // Get recent transactions
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      balance: credits?.balance || 0,
      lifetimePurchased: credits?.lifetime_purchased || 0,
      packages: packages || [],
      transactions: transactions || [],
    });
  } catch (error) {
    await logApiError({
      route: "/api/billing/credits",
      method: "GET",
      status: 500,
      code: "INTERNAL_ERROR",
      message: "크레딧 조회 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : String(error ?? "unknown"),
      error,
      extra: { userId: "current_user" }
    });
    console.error('Get credits error:', error);
    return NextResponse.json({ error: '크레딧 조회 실패' }, { status: 500 });
  }
}
