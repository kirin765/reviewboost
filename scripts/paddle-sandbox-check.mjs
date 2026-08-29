/**
 * Paddle 샌드박스 스모크 테스트 — API 키가 주어졌을 때:
 *  1) GET /prices 로 샌드박스 가격 목록 확인
 *  2) 게스트(비로그인) 트랜잭션 생성(체크아웃 라우트와 동일한 페이로드) → 체크아웃 URL 확인
 *
 * 사용법: PADDLE_API_KEY='pdl_sdbx_...' node scripts/paddle-sandbox-check.mjs
 * (키는 커밋하지 않는다 — 로컬/CI 시크릿으로만)
 */
const API_BASE = "https://sandbox-api.paddle.com";

const apiKey = process.env.PADDLE_API_KEY;
if (!apiKey) {
  console.error("PADDLE_API_KEY 환경변수가 필요합니다.");
  process.exit(2);
}

async function paddle(path, init) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

// 1) 샌드박스 가격 목록
const prices = await paddle("/prices?status=active&per_page=50");
console.log("GET /prices ->", prices.status);
if (!prices.json?.data?.length) {
  console.error("가격 목록을 가져오지 못했습니다:", prices.text);
  process.exit(3);
}
const items = prices.json.data.map((p) => ({
  id: p.id,
  name: p.name ?? null,
  currency: p.unit_price?.currency_code ?? "?",
  amount: p.unit_price?.amount ?? "?",
  interval: p.billing_cycle?.interval ?? p.recurring?.interval ?? "?"
}));
console.log("prices:", JSON.stringify(items, null, 1).slice(0, 1500));

// extension 플랜 후보(가장 비싼/구독형) 선택 — 명시적 price_id 가 있으면 그걸 쓴다.
const explicit = process.env.PADDLE_PRICE_ID;
const priceId = explicit ?? items[0]?.id;
console.log("using price:", priceId);

// 2) 게스트 트랜잭션 생성 (체크아웃 라우트와 동일한 페이로드)
const txn = await paddle("/transactions", {
  method: "POST",
  body: JSON.stringify({
    items: [{ price_id: priceId, quantity: 1 }],
    custom_data: { plan_tier: "extension" }, // 게스트: user_id 없음
    customer: { email_address: "sandbox-guest@example.com" },
    collection_mode: "automatic",
    checkout: {
      url: "https://reviewboost.co.kr/extension-connect?billing=success&plan=extension"
    }
  })
});
console.log("POST /transactions ->", txn.status);
const data = txn.json?.data;
if (txn.status >= 400 || !data) {
  console.error("트랜잭션 생성 실패:", txn.text);
  process.exit(4);
}
console.log("transaction id:", data.id);
console.log("checkout url:", data.checkout?.url ?? null);
console.log("has client_token:", typeof data.client_token === "string" && data.client_token.length > 0);
console.log("customer email:", data.customer?.email_address ?? null);

// 3) 체크아웃 URL 접근성 (Paddle 결제 페이지가 열리는지)
if (data.checkout?.url) {
  const page = await fetch(data.checkout.url, { redirect: "manual" });
  console.log("checkout url status:", page.status, page.statusText);
}
