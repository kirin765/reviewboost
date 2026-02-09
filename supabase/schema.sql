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

-- Migrations for existing installs (safe to re-run)
alter table public.reviews add column if not exists reviewed_at timestamptz null;

-- RLS: users can only see/delete their own analyses.
alter table public.analyses enable row level security;
alter table public.reviews enable row level security;

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
