import { previewReviewCsv } from "@/lib/csv";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

function textError(status: number, message: string) {
  return new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) return textError(415, "multipart/form-data 로 업로드하세요.");

  const form = await req.formData();
  const file = form.get("file");
  const f: any = file;
  if (!f || typeof f !== "object") return textError(400, "file 필드가 필요합니다.");
  if (typeof f.text !== "function") return textError(400, "업로드 파일을 읽을 수 없습니다.");
  const size = typeof f.size === "number" ? f.size : null;
  if (typeof size === "number" && size <= 0) return textError(400, "빈 파일입니다.");
  if (typeof size === "number" && size > MAX_BYTES) return textError(413, `파일이 너무 큽니다. 최대 ${MAX_BYTES} bytes`);

  const csvText = await f.text();
  const preview = previewReviewCsv(csvText);
  return Response.json({
    filename: typeof f.name === "string" ? f.name : null,
    ...preview
  });
}
