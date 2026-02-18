import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const repoRoot = process.cwd();
const sourcePath = join(repoRoot, 'src', 'lib', 'paddle.ts');
const source = readFileSync(sourcePath, 'utf8');

const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022
  }
}).outputText;

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const paddle = await import(moduleUrl);

const managedKeys = ['PADDLE_ENV', 'PADDLE_API_KEY', 'PADDLE_BASIC_PRICE_ID', 'PADDLE_PRO_PRICE_ID'];
const originalEnv = Object.fromEntries(managedKeys.map((k) => [k, process.env[k]]));

function resetEnv() {
  for (const key of managedKeys) {
    const value = originalEnv[key];
    if (typeof value === 'undefined') {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

try {
  delete process.env.PADDLE_ENV;
  assert.equal(paddle.paddleEnv(), 'sandbox', 'defaults to sandbox when PADDLE_ENV is missing');

  process.env.PADDLE_ENV = 'live';
  assert.equal(paddle.paddleEnv(), 'live', 'returns live when PADDLE_ENV=live');

  process.env.PADDLE_ENV = 'LiVe';
  assert.equal(paddle.paddleEnv(), 'live', 'treats PADDLE_ENV case-insensitively');

  process.env.PADDLE_ENV = 'sandbox';
  assert.equal(paddle.paddleEnv(), 'sandbox', 'returns sandbox when PADDLE_ENV=sandbox');

  process.env.PADDLE_API_KEY = 'test_key';
  process.env.PADDLE_BASIC_PRICE_ID = 'pri_basic';
  process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
  assert.equal(paddle.isPaddleConfigured(), true, 'returns true when all required env vars are set');

  process.env.PADDLE_PRO_PRICE_ID = '   ';
  assert.equal(paddle.isPaddleConfigured(), false, 'returns false when required env var is blank');

  process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
  assert.equal(paddle.paddlePriceIdForPlan('basic'), 'pri_basic');
  assert.equal(paddle.paddlePriceIdForPlan('pro'), 'pri_pro');

  process.env.PADDLE_BASIC_PRICE_ID = '  pri_basic_trim  ';
  assert.equal(paddle.paddlePriceIdForPlan('basic'), 'pri_basic_trim', 'trims mapped price id');

  process.env.PADDLE_BASIC_PRICE_ID = 'pri_basic';
  process.env.PADDLE_PRO_PRICE_ID = 'pri_pro';
  assert.equal(paddle.paddlePlanForPriceId('pri_basic'), 'basic');
  assert.equal(paddle.paddlePlanForPriceId('pri_pro'), 'pro');
  assert.equal(paddle.paddlePlanForPriceId('  pri_pro  '), 'pro', 'trims incoming price id before matching');
  assert.equal(paddle.paddlePlanForPriceId('pri_unknown'), 'free');
  assert.equal(paddle.paddlePlanForPriceId(null), 'free');

  console.log('PASS test-paddle-utils');
} finally {
  resetEnv();
}
