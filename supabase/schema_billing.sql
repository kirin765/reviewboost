-- =====================================================
-- Toss Payments + Credit System Schema
-- Add to existing schema.sql
-- =====================================================

-- Toss customer info (extends profiles)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS toss_customer_key VARCHAR(255) UNIQUE;

-- Subscriptions (Toss-based - keep Paddle for backward compatibility)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS toss_subscription_id VARCHAR(255) UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS toss_customer_key VARCHAR(255);

-- User credits
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (Toss)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_order_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit packages (for purchase UI)
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price_krw INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON public.user_credits (user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON public.credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON public.credit_transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments (status);

-- RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

-- Policies for user_credits
DROP POLICY IF EXISTS "user_credits_select_own" ON public.user_credits;
CREATE POLICY "user_credits_select_own" ON public.user_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user_credits_insert_own" ON public.user_credits;
CREATE POLICY "user_credits_insert_own" ON public.user_credits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_credits_update_own" ON public.user_credits;
CREATE POLICY "user_credits_update_own" ON public.user_credits FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policies for credit_transactions
DROP POLICY IF EXISTS "credit_transactions_select_own" ON public.credit_transactions;
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "credit_transactions_insert_own" ON public.credit_transactions;
CREATE POLICY "credit_transactions_insert_own" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policies for payments
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policies for credit_packages (read-only for all)
DROP POLICY IF EXISTS "credit_packages_select_all" ON public.credit_packages;
CREATE POLICY "credit_packages_select_all" ON public.credit_packages FOR SELECT TO authenticated USING (true);

-- Function: Auto-create user credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, balance, lifetime_purchased)
  VALUES (NEW.id, 100, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- Insert default credit packages
INSERT INTO public.credit_packages (name, credits, price_krw, is_active, sort_order) VALUES
  ('Starter', 500, 9900, TRUE, 1),
  ('Pro', 2000, 29000, TRUE, 2),
  ('Business', 5000, 59000, TRUE, 3)
ON CONFLICT DO NOTHING;

-- RPC function for credit deduction
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;
  
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  UPDATE user_credits 
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', 'Service usage');
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for adding credits (for purchases)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_credits 
  SET balance = balance + p_amount,
      lifetime_purchased = lifetime_purchased + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, balance, lifetime_purchased)
    VALUES (p_user_id, p_amount, p_amount);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
