-- Add expanded saved-analysis payload support.

alter table public.analyses
add column if not exists result_payload jsonb null;

comment on column public.analyses.result_payload is
  'Expanded saved analysis payload for detailed result pages.';
