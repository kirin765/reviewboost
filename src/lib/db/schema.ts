import { pgTable, uuid, text, integer, numeric, jsonb, timestamp, boolean, index, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    inputFilename: text("input_filename"),
    stats: jsonb("stats").notNull(),
    suggestions: jsonb("suggestions").notNull(),
    resultPayload: jsonb("result_payload"),
    priorityScore: numeric("priority_score").notNull().default("0")
  },
  (t) => ({
    userCreatedIdx: index("analyses_user_id_created_at_idx").on(t.userId, t.createdAt)
  })
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rating: integer("rating"),
    text: text("text").notNull(),
    sentiment: text("sentiment").notNull(),
    category: text("category").notNull()
  },
  (t) => ({
    analysisIdx: index("reviews_analysis_id_idx").on(t.analysisId)
  })
);

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  paddleCustomerId: text("paddle_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

// 로그인 없이(게스트) 결제한 구독을 이메일로 보관 — 나중에 같은 이메일로 로그인하면
// 해당 행을 subscriptions 로 옮긴다(claimPendingSubscriptionByEmail).
export const pendingSubscriptions = pgTable(
  "pending_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    paddleCustomerId: text("paddle_customer_id").notNull(),
    paddleSubscriptionId: text("paddle_subscription_id").notNull().unique(),
    paddlePriceId: text("paddle_price_id"),
    planTier: text("plan_tier").notNull().default("extension"),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    emailIdx: index("pending_subscriptions_email_idx").on(t.email),
    customerIdx: index("pending_subscriptions_customer_id_idx").on(t.paddleCustomerId)
  })
);

// 크롬 익스텐션 일일 수집 쿼터. day 는 KST 기준 YYYY-MM-DD.
export const extensionUsage = pgTable(
  "extension_usage",
  {
    userId: text("user_id").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.day] })
  })
);

// 결제벽 퍼널 카운터 (한도 도달 → 결제 시작 → 결제 완료). best-effort 기록.
// dedupe_key: 재시도 중복 방지용(예: Paddle transaction id). NULL 은 중복 검사 없음.
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    userId: text("user_id"),
    meta: jsonb("meta"),
    dedupeKey: text("dedupe_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    dedupeIdx: uniqueIndex("funnel_events_dedupe_key_idx").on(t.dedupeKey)
  })
);

// 1:1 고객 문의. 비로그인 접수 허용 — user_id 는 nullable.
export const supportInquiries = pgTable(
  "support_inquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    email: text("email").notNull(),
    category: text("category").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    createdIdx: index("support_inquiries_created_at_idx").on(t.createdAt)
  })
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    paddleCustomerId: text("paddle_customer_id").notNull(),
    paddleSubscriptionId: text("paddle_subscription_id").notNull().unique(),
    paddlePriceId: text("paddle_price_id"),
    status: text("status").notNull(),
    planTier: text("plan_tier").notNull().default("free"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    userIdx: index("subscriptions_user_id_idx").on(t.userId),
    customerIdx: index("subscriptions_customer_id_idx").on(t.paddleCustomerId)
  })
);
