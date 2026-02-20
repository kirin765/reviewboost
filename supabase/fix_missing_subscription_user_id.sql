-- Fix legacy billing rows where user_id was not persisted in subscriptions.
-- Run once in Supabase SQL Editor if needed.

-- subscriptions가 user_id 없이 들어간 행을 고객ID 기준으로 profiles 기준값으로 보정
update public.subscriptions s
set
  user_id = p.user_id,
  updated_at = now()
from public.profiles p
where
  s.user_id is null
  and s.paddle_customer_id is not null
  and p.paddle_customer_id = s.paddle_customer_id
  and p.user_id is not null;

-- 반대로 profiles에 paddle_customer_id가 비어있는 경우, 동일 user_id의 유효한 구독고객ID로 채움
update public.profiles p
set
  paddle_customer_id = s.paddle_customer_id,
  updated_at = now()
from public.subscriptions s
where
  p.paddle_customer_id is null
  and s.user_id = p.user_id
  and s.paddle_customer_id is not null
  and s.user_id is not null;
