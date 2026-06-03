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
    .where(eq(analyses.userId, uid))
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

export async function insertAnalysisForUser(record: {
  userId: string;
  clientIp: string | null;
  inputFilename: string | null;
  stats: unknown;
  suggestions: unknown;
  resultPayload?: unknown;
  priorityScore: number;
}) {
  const uid = requireUserId(record.userId);
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .insert(analyses)
    .values({
      userId: uid,
      clientIp: record.clientIp,
      inputFilename: record.inputFilename,
      stats: record.stats as any,
      suggestions: record.suggestions as any,
      resultPayload: (record.resultPayload ?? null) as any,
      priorityScore: String(record.priorityScore)
    })
    .returning({ id: analyses.id });
  return rows[0]?.id ?? null;
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
