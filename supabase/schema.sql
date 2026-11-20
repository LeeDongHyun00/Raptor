-- Key/value document store used by src/lib/store.ts.
-- Keys: "workspace" (product, materials, guideline, differentiators),
--       "runs" (generation history, topics, approval status),
--       "asset:<id>" (uploaded file bytes as base64).
create table if not exists trihorn_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Server-side access only (service role key); no anon policies on purpose.
alter table trihorn_kv enable row level security;
