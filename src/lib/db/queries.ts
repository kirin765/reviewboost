import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./index";
import { analyses, reviews, profiles, subscriptions } from "./schema";

function requireUserId(userId: string) {
  if (!userId || !userId.trim()) throw new Error("userId is required for scoped query");
  return userId;
}

// Exported for unit testing the scope guard.
export function buildAnalysisListQueryFilter(userId: string) {
  return { userId: requireUserId(userId) };
}

export async function listAnalysesForUser(userId: string, limit = 50) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      inputFilename: analyses.inputFilename,
      stats: analyses.stats,
      priorityScore: analyses.priorityScore
    })
    .from(analyses)
    // Exclude reserved-but-unfinalized placeholder rows (stats is an empty object
    // until finalize writes the real stats). Using stats — not result_payload —
    // avoids hiding legacy rows that predate the result_payload column.
    .where(and(eq(analyses.userId, uid), sql`${analyses.stats} <> '{}'::jsonb`))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}

export async function getAnalysisForUser(analysisId: string, userId: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      inputFilename: analyses.inputFilename,
      stats: analyses.stats,
      suggestions: analyses.suggestions
    })
    .from(analyses)
    .where(and(eq(analyses.id, analysisId), eq(analyses.userId, uid)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAnalysisDetailForUser(analysisId: string, userId: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      inputFilename: analyses.inputFilename,
      priorityScore: analyses.priorityScore,
      stats: analyses.stats,
      suggestions: analyses.suggestions,
      resultPayload: analyses.resultPayload
    })
    .from(analyses)
    .where(and(eq(analyses.id, analysisId), eq(analyses.userId, uid)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReviewsForAnalysis(analysisId: string, userId: string, limit = 120) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: reviews.id,
      reviewedAt: reviews.reviewedAt,
      rating: reviews.rating,
      text: reviews.text,
      sentiment: reviews.sentiment,
      category: reviews.category
    })
    .from(reviews)
    .innerJoin(analyses, eq(reviews.analysisId, analyses.id))
    .where(and(eq(reviews.analysisId, analysisId), eq(analyses.userId, uid)))
    .orderBy(desc(reviews.reviewedAt))
    .limit(limit);
}

export async function countAnalysesForUserSince(userId: string, sinceIso: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return 0;
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(analyses)
    .where(and(eq(analyses.userId, uid), gte(analyses.createdAt, new Date(sinceIso))));
  return rows[0]?.n ?? 0;
}

export type ReserveSlotResult =
  | { ok: true; id: string }
  | { ok: false; reason: "over_limit" | "storage_off" };

/**
 * Atomically reserves an analysis slot before the (expensive) pipeline runs.
 * When a monthly limit applies, the row is inserted only if the user is still
 * under the limit — a single conditional statement, so concurrent bursts can no
 * longer all pass a stale count and run paid LLM work. The placeholder row is
 * finalized via finalizeAnalysisForUser or released via releaseAnalysisSlot.
 */
export async function reserveAnalysisSlot(record: {
  userId: string;
  clientIp: string | null;
  inputFilename: string | null;
  sinceIso: string;
  monthlyLimit: number | null;
}): Promise<ReserveSlotResult> {
  const uid = requireUserId(record.userId);
  const db = getDb();
  if (!db) return { ok: false, reason: "storage_off" };

  if (record.monthlyLimit === null) {
    const rows = await db
      .insert(analyses)
      .values({
        userId: uid,
        clientIp: record.clientIp,
        inputFilename: record.inputFilename,
        stats: {} as any,
        suggestions: {} as any,
        resultPayload: null as any,
        priorityScore: "0"
      })
      .returning({ id: analyses.id });
    const id = rows[0]?.id;
    return id ? { ok: true, id } : { ok: false, reason: "storage_off" };
  }

  const since = new Date(record.sinceIso);
  const res: any = await db.execute(sql`
    insert into ${analyses} (user_id, client_ip, input_filename, stats, suggestions, result_payload, priority_score)
    select ${uid}, ${record.clientIp}, ${record.inputFilename}, '{}'::jsonb, '{}'::jsonb, null, '0'
    where (
      select count(*) from ${analyses}
      where user_id = ${uid} and created_at >= ${since}
    ) < ${record.monthlyLimit}
    returning id
  `);
  const rows = Array.isArray(res) ? res : (res?.rows ?? []);
  const id = rows[0]?.id;
  return id ? { ok: true, id } : { ok: false, reason: "over_limit" };
}

export async function finalizeAnalysisForUser(
  analysisId: string,
  userId: string,
  record: {
    inputFilename: string | null;
    stats: unknown;
    suggestions: unknown;
    resultPayload?: unknown;
    priorityScore: number;
  }
): Promise<boolean> {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return false;
  const rows = await db
    .update(analyses)
    .set({
      inputFilename: record.inputFilename,
      stats: record.stats as any,
      suggestions: record.suggestions as any,
      resultPayload: (record.resultPayload ?? null) as any,
      priorityScore: String(record.priorityScore)
    })
    .where(and(eq(analyses.id, analysisId), eq(analyses.userId, uid)))
    .returning({ id: analyses.id });
  return Boolean(rows[0]?.id);
}

export async function releaseAnalysisSlot(analysisId: string, userId: string): Promise<void> {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return;
  await db.delete(analyses).where(and(eq(analyses.id, analysisId), eq(analyses.userId, uid)));
}

export async function insertReviewsForAnalysis(
  analysisId: string,
  rows: Array<{
    rating: number | null;
    text: string;
    sentiment: string;
    category: string;
    reviewedAt: string | null;
  }>
) {
  const db = getDb();
  if (!db || rows.length === 0) return;
  await db.insert(reviews).values(
    rows.map((r) => ({
      analysisId,
      rating: r.rating,
      text: r.text,
      sentiment: r.sentiment,
      category: r.category,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null
    }))
  );
}

export { analyses, reviews, profiles, subscriptions, getDb, and, eq };
