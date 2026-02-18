-- US-01: Billing domain schema hardening (idempotent)

create extension if not exists "uuid-ossp";

alter table public.profiles
  add column if not exists paddle_customer_id text null;

alter table public.subscriptions
  add column if not exists paddle_customer_id text null,
  add column if not exists paddle_subscription_id text null,
  add column if not exists paddle_price_id text null,
  add column if not exists status text not null default 'inactive',
  add column if not exists plan_tier text not null default 'free',
  add column if not exists current_period_start timestamptz null,
  add column if not exists current_period_end timestamptz null,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_paddle_customer_id_idx on public.profiles (paddle_customer_id);
create unique index if not exists profiles_paddle_customer_id_uniq
  on public.profiles (paddle_customer_id)
  where paddle_customer_id is not null;

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_customer_id_idx on public.subscriptions (paddle_customer_id);
create unique index if not exists subscriptions_paddle_subscription_id_uniq
  on public.subscriptions (paddle_subscription_id)
  where paddle_subscription_id is not null;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
to authenticated
using (user_id = auth.uid());
