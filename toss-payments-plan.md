# Toss Payments 결제 시스템 구현 계획

## 개요

기존 Paddle 기반 결제 시스템을 Toss Payments로 교체하는 것을 목표로 한다. 토스 페이먼트는 한국 사용자들에게 더 익숙하고 다양한 결제 옵션을 제공한다.

## 주요 변경 사항

### 1. 데이터베이스 스키마 변경

```sql
-- 기존 subscriptions 테이블을 Toss 기반으로 변경
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Toss Payments 정보
  toss_subscription_id VARCHAR(255) UNIQUE,
  toss_customer_key VARCHAR(255) UNIQUE,
  
  -- 구독 정보
  plan_tier VARCHAR(20) DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro')),
  status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'past_due', 'canceled')),
  
  -- 기간
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 크레딧 시스템
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 크레딧 거래 내역
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 결제 기록
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  toss_order_id VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KRW',
  status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. API 엔드포인트 설계

```
POST /api/billing/checkout     # Toss Payments checkout 세션 생성
POST /api/billing/webhook     # Toss webhook 핸들링
GET  /api/billing/subscription  # 현재 구독 상태 조회
POST /api/billing/subscription/cancel  # 구독 취소
GET  /api/billing/credits     # 크레딧 잔액 조회
POST /api/billing/credits/purchase  # 크레딧 구매
GET  /api/billing/history      # 결제/크레딧 내역
```

### 3. Toss Payments 연동 흐름

```
1. 사용자 → 구독/크레딧 구매 버튼 클릭
2. 서버 → Toss Payments Checkout API 호출 (customerKey 포함)
3. Toss → 사용자 결제 페이지 표시
4. 결제 완료 → Toss → Webhook 알림
5. 서버 → Webhook 처리 → 구독/크레딧 업데이트
6. 사용자 → 완료 페이지_redirect
```

### 4. 크레딧 차감 로직

```typescript
// 분석 요청 시 크레딧 차감
async function deductCredits(userId: string, amount: number) {
  const { data: credits } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  
  if (!credits || credits.balance < amount) {
    throw new Error('크레딧이 부족합니다.');
  }
  
  await supabase.rpc('deduct_credits', { 
    p_user_id: userId, 
    p_amount: amount 
  });
  
  // 거래 내역 기록
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'usage',
    description: '분석 사용'
  });
}
```

### 5. 플랜별 크레딧 정책

| 플랜 | 월간 크레딧 | 관리 |
|------|------------|------|
| Free | 100 | 기존 사용자 |
| Starter | 1,000 | 월 9,900원 |
| Pro | 5,000 | 월 39,000원 |

### 6. 구현 체크리스트

#### Phase 1: 데이터베이스
- [ ] subscriptions 테이블 생성
- [ ] user_credits 테이블 생성
- [ ] credit_transactions 테이블 생성
- [ ] payments 테이블 생성
- [ ] RLS 정책 설정

#### Phase 2: 백엔드 API
- [ ] Toss Payments SDK 설정
- [ ] /api/billing/checkout API 구현
- [ ] /api/billing/webhook API 구현
- [ ] 구독 상태 조회 API
- [ ] 구독 취소 API
- [ ] 크레딧 구매/조회 API

#### Phase 3: 프론트엔드
- [ ] Pricing 페이지 업데이트 (Toss UI)
- [ ] 크레딧 구매 UI
- [ ] 구독 관리 페이지
- [ ] 결제 히스토리 페이지

#### Phase 4: 마이그레이션
- [ ] 기존 Paddle 구독 데이터 Toss로 마이그레이션
- [ ] 사용자通知

### 7. 환경변수

```env
# Toss Payments
TOSS_CLIENT_KEY=...
TOSS_SECRET_KEY=...
TOSS_WEBHOOK_SECRET=...

# 기존 (유지)
PADDLE_ENV=sandbox
# 또는 제거
```

---

이 계획으로 진행할까요, 아니면 특정 부분부터 시작할까요?
