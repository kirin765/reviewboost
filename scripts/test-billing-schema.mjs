import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();
const schemaPath = join(repoRoot, 'src', 'lib', 'db', 'schema.ts');

const schemaTs = readFileSync(schemaPath, 'utf8');

function assertContains(label, content, regex) {
  if (!regex.test(content)) {
    throw new Error(`Missing ${label}`);
  }
}

assertContains(
  'profiles.paddleCustomerId column (unique)',
  schemaTs,
  /paddleCustomerId:\s*text\("paddle_customer_id"\)\.unique\(\)/,
);

assertContains(
  'subscriptions.status column (notNull)',
  schemaTs,
  /status:\s*text\("status"\)\.notNull\(\)/,
);

assertContains(
  'subscriptions.planTier column (notNull, default free)',
  schemaTs,
  /planTier:\s*text\("plan_tier"\)\.notNull\(\)\.default\("free"\)/,
);

assertContains(
  'subscriptions.paddleSubscriptionId column (notNull, unique)',
  schemaTs,
  /paddleSubscriptionId:\s*text\("paddle_subscription_id"\)\.notNull\(\)\.unique\(\)/,
);

assertContains(
  'subscriptions.paddlePriceId column',
  schemaTs,
  /paddlePriceId:\s*text\("paddle_price_id"\)/,
);

assertContains(
  'subscriptions.cancelAtPeriodEnd column (notNull, default false)',
  schemaTs,
  /cancelAtPeriodEnd:\s*boolean\("cancel_at_period_end"\)\.notNull\(\)\.default\(false\)/,
);

assertContains(
  'subscriptions current period start/end timestamps',
  schemaTs,
  /currentPeriodStart:\s*timestamp\("current_period_start"[\s\S]*currentPeriodEnd:\s*timestamp\("current_period_end"/,
);

assertContains(
  'subscriptions user_id lookup index',
  schemaTs,
  /index\("subscriptions_user_id_idx"\)\.on\(t\.userId\)/,
);

assertContains(
  'subscriptions paddle customer lookup index',
  schemaTs,
  /index\("subscriptions_customer_id_idx"\)\.on\(t\.paddleCustomerId\)/,
);

assertContains(
  'analyses.resultPayload column for richer saved analyses',
  schemaTs,
  /resultPayload:\s*jsonb\("result_payload"\)/,
);

console.log('Billing schema (Drizzle) checks passed.');
