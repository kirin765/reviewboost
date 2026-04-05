-- ReviewBoost MVP schema (run in Supabase SQL editor)

create extension if not exists "uuid-ossp";

create table if not exists public.analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid null,
  created_at timestamptz not null default now(),
  input_filename text null,
  stats jsonb not null,
  suggestions jsonb not null,
  priority_score numeric not null default 0
);

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
  status text not null,
  plan_tier text not null default 'free',
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_coupang_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vendor_id_encrypted text not null,
  access_key_encrypted text not null,
  secret_key_encrypted text not null,
  access_key_last4 text null,
  market text not null default 'KR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_paddle_customer_id_idx on public.profiles (paddle_customer_id);
create unique index if not exists profiles_paddle_customer_id_uniq on public.profiles (paddle_customer_id) where paddle_customer_id is not null;
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_customer_id_idx on public.subscriptions (paddle_customer_id);
create index if not exists user_coupang_credentials_updated_at_idx on public.user_coupang_credentials (updated_at);

-- Migrations for existing installs (safe to re-run)
alter table public.reviews add column if not exists reviewed_at timestamptz null;
alter table public.profiles add column if not exists paddle_customer_id text null;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.subscriptions add column if not exists paddle_customer_id text null;
alter table public.subscriptions add column if not exists paddle_subscription_id text null;
alter table public.subscriptions add column if not exists paddle_price_id text null;
alter table public.subscriptions add column if not exists plan_tier text not null default 'free';
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();
alter table public.user_coupang_credentials add column if not exists vendor_id_encrypted text;
alter table public.user_coupang_credentials add column if not exists access_key_encrypted text;
alter table public.user_coupang_credentials add column if not exists secret_key_encrypted text;
alter table public.user_coupang_credentials add column if not exists access_key_last4 text null;
alter table public.user_coupang_credentials add column if not exists market text not null default 'KR';
alter table public.user_coupang_credentials add column if not exists created_at timestamptz not null default now();
alter table public.user_coupang_credentials add column if not exists updated_at timestamptz not null default now();

-- RLS: users can only see/delete their own analyses.
alter table public.analyses enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_coupang_credentials enable row level security;

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

drop policy if exists "user_coupang_credentials_select_own" on public.user_coupang_credentials;
create policy "user_coupang_credentials_select_own"
on public.user_coupang_credentials
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_coupang_credentials_insert_own" on public.user_coupang_credentials;
create policy "user_coupang_credentials_insert_own"
on public.user_coupang_credentials
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_coupang_credentials_update_own" on public.user_coupang_credentials;
create policy "user_coupang_credentials_update_own"
on public.user_coupang_credentials
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
