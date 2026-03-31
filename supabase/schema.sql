-- ReviewBoost MVP schema (run in Supabase SQL editor)

create extension if not exists "uuid-ossp";

create table if not exists public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid null,
  client_ip inet null,
  created_at timestamptz not null default now(),
  input_filename text null,
  stats jsonb not null,
  suggestions jsonb not null,
  result_payload jsonb null,
  priority_score numeric not null default 0
);

create index if not exists analyses_client_ip_created_at_idx on public.analyses (client_ip, created_at);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  rating int null,
  text text not null,
  sentiment text not null,
  category text not null
);

create index if not exists reviews_analysis_id_idx on public.reviews (analysis_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Paddle customer identifier. Nullable for pre-billing users.
  paddle_customer_id text unique null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_customer_id text not null,
  paddle_subscription_id text not null unique,
  paddle_price_id text null,
  -- Paddle subscription status values (active, trialing, past_due, canceled, paused, etc).
  status text not null,
  -- Internal entitlement tier derived from Paddle price mapping (free, pro, team, enterprise, ...).
  plan_tier text not null default 'free',
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_paddle_customer_id_idx on public.profiles (paddle_customer_id);
create unique index if not exists profiles_paddle_customer_id_uniq on public.profiles (paddle_customer_id) where paddle_customer_id is not null;
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_customer_id_idx on public.subscriptions (paddle_customer_id);
create index if not exists subscriptions_paddle_subscription_id_idx on public.subscriptions (paddle_subscription_id);
create unique index if not exists subscriptions_paddle_subscription_id_uniq on public.subscriptions (paddle_subscription_id);

-- Migrations for existing installs (safe to re-run)
alter table public.reviews add column if not exists reviewed_at timestamptz null;
alter table public.profiles add column if not exists paddle_customer_id text null;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.subscriptions add column if not exists paddle_customer_id text null;
alter table public.subscriptions add column if not exists paddle_subscription_id text null;
alter table public.subscriptions add column if not exists paddle_price_id text null;
alter table public.subscriptions add column if not exists status text not null default 'inactive';
alter table public.subscriptions add column if not exists plan_tier text not null default 'free';
alter table public.subscriptions add column if not exists current_period_start timestamptz null;
alter table public.subscriptions add column if not exists current_period_end timestamptz null;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();
alter table public.analyses add column if not exists result_payload jsonb null;
create unique index if not exists subscriptions_paddle_subscription_id_uniq on public.subscriptions (paddle_subscription_id) where paddle_subscription_id is not null;

-- Backfill-friendly constraints: only enforce NOT NULL after legacy rows are populated.
do $$
begin
  if not exists (
    select 1 from public.subscriptions
    where paddle_customer_id is null
      or paddle_subscription_id is null
  ) then
    alter table public.subscriptions alter column paddle_customer_id set not null;
    alter table public.subscriptions alter column paddle_subscription_id set not null;
  else
    raise notice 'Skipping NOT NULL enforcement on subscriptions Paddle IDs until legacy null rows are backfilled.';
  end if;
end $$;

-- RLS: users can only see/delete their own analyses.
alter table public.analyses enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own"
on public.analyses
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own"
on public.analyses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own"
on public.analyses
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "reviews_select_via_analysis" on public.reviews;
create policy "reviews_select_via_analysis"
on public.reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.analyses a
    where a.id = reviews.analysis_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "reviews_insert_via_analysis" on public.reviews;
create policy "reviews_insert_via_analysis"
on public.reviews
for insert
to authenticated
with check (
  exists (
    select 1
    from public.analyses a
    where a.id = reviews.analysis_id
      and a.user_id = auth.uid()
  )
);

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
