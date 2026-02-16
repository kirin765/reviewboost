import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/toss';

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-toss-signature') || '';

    // Verify webhook signature
    try {
      if (!verifyWebhookSignature(bodyText, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (err) {
      // If webhook secret not set, log and continue for development
      console.log('Webhook signature verification skipped:', err);
    }

    const event = JSON.parse(bodyText);
    const eventType = event.eventType;
    const data = event.data;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    switch (eventType) {
      case 'PAYMENT_COMPLETED': {
        const { orderId, paymentKey, amount } = data;
        
        // Find payment record
        const { data: payment } = await supabase
          .from('payments')
          .select('user_id, status')
          .eq('toss_order_id', orderId)
          .single();

        if (payment && payment.status === 'pending') {
          // Update payment status
          await supabase
            .from('payments')
            .update({ status: 'completed', payment_method: 'EASY_PAYMENT' })
            .eq('toss_order_id', orderId);

          // Add credits to user
          await supabase.rpc('add_credits', {
            p_user_id: payment.user_id,
            p_amount: amount,
          });

          // Record transaction
          await supabase.from('credit_transactions').insert({
            user_id: payment.user_id,
            amount,
            type: 'purchase',
            description: '크레딧 구매',
          });
        }
        break;
      }

      case 'PAYMENT_FAILED':
      case 'PAYMENT_CANCELLED': {
        const { orderId } = data;
        await supabase
          .from('payments')
          .update({ status: eventType === 'PAYMENT_CANCELLED' ? 'cancelled' : 'failed' })
          .eq('toss_order_id', orderId);
        break;
      }

      default:
        console.log('Unhandled Toss event:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
