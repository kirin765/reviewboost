-- Add result_payload to public.analyses for saved-analysis detail pages.
-- Run once in Supabase SQL Editor for existing environments that were created
-- before result_payload support was added.

begin;

alter table public.analyses
add column if not exists result_payload jsonb null;

comment on column public.analyses.result_payload is
  'Expanded saved analysis payload for detailed result pages.';

commit;

-- Verification
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'analyses'
  and column_name = 'result_payload';
