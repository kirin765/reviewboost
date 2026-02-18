import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const schemaPath = join(repoRoot, 'supabase', 'schema.sql');
const migrationPath = join(repoRoot, 'supabase', 'migrations', '20260218172500_us01_billing_schema.sql');

const schemaSql = readFileSync(schemaPath, 'utf8');
const migrationSql = readFileSync(migrationPath, 'utf8');

function assertContains(label, content, regex) {
  if (!regex.test(content)) {
    throw new Error(`Missing ${label}`);
  }
}

assertContains(
  'profiles.paddle_customer_id column definition',
  schemaSql,
  /create table if not exists public\.profiles[\s\S]*paddle_customer_id\s+text\s+unique\s+null/i,
);

assertContains(
  'subscriptions.status column definition',
  schemaSql,
  /create table if not exists public\.subscriptions[\s\S]*status\s+text\s+not null/i,
);

assertContains(
  'subscriptions.plan_tier column definition',
  schemaSql,
  /create table if not exists public\.subscriptions[\s\S]*plan_tier\s+text\s+not null/i,
);

assertContains(
  'subscriptions.paddle_subscription_id column definition',
  schemaSql,
  /create table if not exists public\.subscriptions[\s\S]*paddle_subscription_id\s+text\s+not null\s+unique/i,
);

assertContains(
  'subscriptions_select_own RLS policy',
  schemaSql,
  /create policy\s+"subscriptions_select_own"[\s\S]*on public\.subscriptions[\s\S]*for select/i,
);

assertContains(
  'idempotent migration unique index for paddle_subscription_id',
  schemaSql,
  /create unique index if not exists subscriptions_paddle_subscription_id_uniq[\s\S]*paddle_subscription_id/i,
);

assertContains(
  'migration file includes subscriptions_select_own policy',
  migrationSql,
  /create policy\s+"subscriptions_select_own"[\s\S]*on public\.subscriptions/i,
);

assertContains(
  'migration file includes unique index for paddle_subscription_id',
  migrationSql,
  /create unique index if not exists subscriptions_paddle_subscription_id_uniq[\s\S]*paddle_subscription_id/i,
);

console.log('Billing schema migration checks passed.');
