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

create index if not exists user_coupang_credentials_updated_at_idx on public.user_coupang_credentials (updated_at);

alter table public.user_coupang_credentials enable row level security;

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
