import { classifyHeuristic, computeAnalysisFromClassified } from "@/lib/analysis";
import { parseReviewCsvWithMapping } from "@/lib/csv";
import { classifyReviewsWithOpenAI } from "@/lib/openai_classify";
import { generateSuggestions } from "@/lib/openai_suggestions";
import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

function jsonError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) return jsonError(415, "multipart/form-data 로 업로드하세요.");

  const form = await req.formData();
  const file = form.get("file");
  const f: any = file;
  if (!f || typeof f !== "object") return jsonError(400, "file 필드가 필요합니다.");
  if (typeof f.text !== "function") return jsonError(400, "업로드 파일을 읽을 수 없습니다.");
  const size = typeof f.size === "number" ? f.size : null;
  if (typeof size === "number" && size <= 0) return jsonError(400, "빈 파일입니다.");
  if (typeof size === "number" && size > MAX_BYTES) return jsonError(413, `파일이 너무 큽니다. 최대 ${MAX_BYTES} bytes`);

  const filename = typeof f.name === "string" ? f.name : null;
  const csvText = await f.text();

  const headerMode = (form.get("headerMode") as string | null) ?? null;
  const textCol = (form.get("textCol") as string | null) ?? null;
  const ratingCol = (form.get("ratingCol") as string | null) ?? null;
  const dateCol = (form.get("dateCol") as string | null) ?? null;
  const useLLM = String(form.get("useLLM") ?? "").trim() === "1";

  let rows;
  try {
    rows = parseReviewCsvWithMapping(csvText, {
      headerMode: headerMode === "headerless" ? "headerless" : "header",
      textCol: textCol || undefined,
      ratingCol: ratingCol || undefined,
      dateCol: dateCol || undefined
    });
  } catch (e: any) {
    return jsonError(400, `CSV 파싱 실패: ${e?.message ?? String(e)}`);
  }

  // 1) Heuristic classification (baseline)
  let classified = classifyHeuristic(rows);

  // 2) Optional: LLM classification for sentiment/category
  if (useLLM) {
    try {
      const llm = await classifyReviewsWithOpenAI({ texts: classified.map((r) => r.text) });
      if (llm && llm.length === classified.length) {
        classified = classified.map((r, idx) => ({
          ...r,
          sentiment: llm[idx]!.sentiment,
          category: llm[idx]!.category
        }));
      }
    } catch {
      // ignore; keep heuristic
    }
  }

  const { stats } = computeAnalysisFromClassified(classified);
  const suggestions = await generateSuggestions(stats);
  const payload = {
    stats,
    suggestions,
    meta: {
      filename,
      stored: false as const
    }
  };

  // Optional persistence (Supabase)
  try {
    const supabaseAuth = createSupabaseServerActionClient();
    const { data: authData } = await supabaseAuth.auth.getUser();
    const userId = authData.user?.id ?? null;

    // 1) If service role is configured, insert with admin client (bypasses RLS).
    const admin = getSupabaseAdminClient();
    if (admin) {
      const insertAnalysis = await admin
        .from("analyses")
        .insert({
          user_id: userId,
          input_filename: filename,
          stats,
          suggestions,
          priority_score: stats.priorityScore
        })
        .select("id")
        .single();

      const analysisId = insertAnalysis.data?.id as string | undefined;
      if (analysisId) {
        const reviews = classified.slice(0, 5000).map((r) => ({
          analysis_id: analysisId,
          rating: r.rating,
          text: r.text,
          sentiment: r.sentiment,
          category: r.category,
          reviewed_at: r.reviewedAt ?? null
        }));
        if (reviews.length) await admin.from("reviews").insert(reviews);
        return Response.json({ ...payload, meta: { filename, stored: true as const, analysisId } });
      }
    }

    // 2) No service role: insert via user session (requires RLS + authenticated user).
    if (userId) {
      const insertAnalysis = await supabaseAuth
        .from("analyses")
        .insert({
          user_id: userId,
          input_filename: filename,
          stats,
          suggestions,
          priority_score: stats.priorityScore
        })
        .select("id")
        .single();

      const analysisId = insertAnalysis.data?.id as string | undefined;
      if (analysisId) {
        return Response.json({ ...payload, meta: { filename, stored: true as const, analysisId } });
      }
    }
  } catch {
    // 저장 실패는 분석 결과 반환을 막지 않음
  }

  return Response.json(payload);
}
