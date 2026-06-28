import { pgTable, uuid, text, integer, numeric, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

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

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    source: text("source").notNull(),
    productUrl: text("product_url"),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    emailCreatedIdx: index("leads_email_created_at_idx").on(t.email, t.createdAt)
  })
);
