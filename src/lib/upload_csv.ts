import { ApiError } from "@/lib/api_error";
import {
  CSV_EMPTY_HELP,
  CSV_ENCODING_HELP,
  CSV_NOT_CSV_HELP,
  CSV_TOO_LARGE_HELP,
  UPLOAD_BAD_CONTENT_TYPE_HELP,
  UPLOAD_MISSING_FILE_HELP,
  UPLOAD_UNREADABLE_FILE_HELP
} from "@/lib/csv_errors";

export const DEFAULT_MAX_CSV_BYTES = 6 * 1024 * 1024;

export type UploadedCsv = {
  form: FormData;
  filename: string | null;
  mime: string | null;
  size: number | null;
  csvText: string;
};

function fileExt(name: string | null): string | null {
  if (!name) return null;
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m?.[1]?.toLowerCase() ?? null;
}

function looksLikeBadEncoding(s: string): boolean {
  // When non-UTF8 CSV is decoded as UTF-8, U+FFFD replacement chars often appear.
  const count = (s.match(/\uFFFD/g) ?? []).length;
  if (count < 3) return false;
  return count / Math.max(1, s.length) > 0.001;
}

export async function readUploadedCsvText(req: Request, maxBytes: number): Promise<UploadedCsv> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    throw new ApiError(415, "UPLOAD_BAD_CONTENT_TYPE", "CSV 파일(.csv)을 업로드해주세요.", {
      help: UPLOAD_BAD_CONTENT_TYPE_HELP
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  const f: any = file;
  if (!f || typeof f !== "object") {
    throw new ApiError(400, "UPLOAD_MISSING_FILE", "업로드할 파일이 필요합니다.", {
      help: UPLOAD_MISSING_FILE_HELP
    });
  }
  if (typeof f.text !== "function") {
    throw new ApiError(400, "UPLOAD_UNREADABLE_FILE", "업로드 파일을 읽을 수 없습니다.", {
      help: UPLOAD_UNREADABLE_FILE_HELP
    });
  }

  const size = typeof f.size === "number" ? f.size : null;
  if (typeof size === "number" && size <= 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 CSV를 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (typeof size === "number" && size > maxBytes) {
    throw new ApiError(413, "CSV_TOO_LARGE", "파일이 너무 커서 업로드할 수 없어요.", {
      help: CSV_TOO_LARGE_HELP
    });
  }

  const filename = typeof f.name === "string" ? f.name : null;
  const mime = typeof f.type === "string" ? f.type : null;
  const ext = fileExt(filename);
  if (ext && ext !== "csv") {
    throw new ApiError(400, "CSV_NOT_CSV", "CSV 파일(.csv)만 업로드할 수 있어요.", {
      help: CSV_NOT_CSV_HELP,
      details: filename ?? undefined
    });
  }

  const csvText = await f.text();
  if (csvText.trim().length === 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 CSV를 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (looksLikeBadEncoding(csvText)) {
    throw new ApiError(400, "CSV_ENCODING", "문자가 깨진 CSV로 보여요(인코딩 문제).", {
      help: CSV_ENCODING_HELP
    });
  }

  return { form, filename, mime, size, csvText };
}
