-- 결제벽 퍼널 카운터 (2026-08-07 paywall-visibility).
-- 주의: 이 repo 는 drizzle-kit push 로 스키마를 반영해 왔고 기존 테이블(analyses,
-- reviews, profiles, extension_usage, subscriptions)은 이미 라이브 DB에 존재한다.
-- 그래서 이 첫 마이그레이션 파일은 새 테이블 funnel_events 만 담는다
-- (meta/0000_snapshot.json 은 전체 스키마를 스냅샷해 이후 generate 가 증분으로 동작).
CREATE TABLE IF NOT EXISTS "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"user_id" text,
	"meta" jsonb,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "funnel_events_dedupe_key_idx" ON "funnel_events" USING btree ("dedupe_key");
