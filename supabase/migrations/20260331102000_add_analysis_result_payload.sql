alter table public.analyses
add column if not exists result_payload jsonb null;
