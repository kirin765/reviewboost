CREATE TABLE "pending_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"paddle_subscription_id" text NOT NULL,
	"paddle_price_id" text,
	"plan_tier" text DEFAULT 'extension' NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_subscriptions_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id")
);
--> statement-breakpoint
CREATE INDEX "pending_subscriptions_email_idx" ON "pending_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "pending_subscriptions_customer_id_idx" ON "pending_subscriptions" USING btree ("paddle_customer_id");
