// Toss Payments integration
const TOSS_API_BASE = 'https://api.tosspayments.com';

function tossSecretKey() {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error('TOSS_SECRET_KEY is not set');
  return key;
}

function tossWebhookSecret() {
  return process.env.TOSS_WEBHOOK_SECRET;
}

export function isTossConfigured() {
  return Boolean(process.env.TOSS_SECRET_KEY && process.env.TOSS_CLIENT_KEY);
}

export function tossClientKey() {
  return process.env.TOSS_CLIENT_KEY || '';
}

// Generate customerKey for Toss Payments
export function generateCustomerKey(userId: string): string {
  return `customer_${userId.replace(/-/g, '')}_${Date.now()}`;
}

// Create payment window URL (for frontend to open Toss payment)
export async function createPaymentWindow(params: {
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}) {
  const response = await fetch(`${TOSS_API_BASE}/v1/payments/general`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tossSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerKey: params.customerKey,
      method: 'EASY_PAYMENT',
      orderId: params.orderId,
      orderName: params.orderName,
      amount: params.amount,
      successUrl: `${process.env.APP_BASE_URL}/billing/success?orderId=${params.orderId}`,
      failUrl: `${process.env.APP_BASE_URL}/billing/fail?orderId=${params.orderId}`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Toss payment creation failed');
  }

  return response.json();
}

// Confirm payment
export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  const response = await fetch(`${TOSS_API_BASE}/v1/payments/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tossSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Toss payment confirmation failed');
  }

  return response.json();
}

// Verify webhook signature
export function verifyWebhookSignature(body: string, signature: string) {
  const crypto = require('crypto');
  const webhookSecret = tossWebhookSecret();
  
  if (!webhookSecret) {
    throw new Error('TOSS_WEBHOOK_SECRET is not set');
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('base64');
  
  return signature === expectedSignature;
}

// Get payment details
export async function getPayment(paymentKey: string) {
  const response = await fetch(`${TOSS_API_BASE}/v1/payments/${paymentKey}`, {
    headers: {
      'Authorization': `Bearer ${tossSecretKey()}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
