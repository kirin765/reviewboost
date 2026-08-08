import { ApiError } from "@/lib/api_error";
import { xlsxToCsv } from "@/lib/xlsx-import";
import {
  CSV_EMPTY_HELP,
  CSV_ENCODING_HELP,
  CSV_NOT_CSV_HELP,
  XLSX_UNREADABLE_HELP,
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

function isReadableFormFile(value: unknown): value is { text: () => Promise<string>; size?: unknown; name?: unknown; type?: unknown } {
  if (!value || typeof value !== "object") return false;
  const file = value as { text?: unknown };
  return typeof file.text === "function";
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
  if (!isReadableFormFile(file)) {
    throw new ApiError(400, "UPLOAD_MISSING_FILE", "업로드할 파일이 필요합니다.", {
      help: UPLOAD_MISSING_FILE_HELP
    });
  }
  
  const size = typeof file.size === "number" ? file.size : null;
  if (typeof size === "number" && size <= 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 파일을 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (typeof size === "number" && size > maxBytes) {
    throw new ApiError(413, "CSV_TOO_LARGE", "파일이 너무 커서 업로드할 수 없어요.", {
      help: CSV_TOO_LARGE_HELP
    });
  }

  const filename = typeof file.name === "string" ? file.name : null;
  const mime = typeof file.type === "string" ? file.type : null;
  const ext = fileExt(filename);
  if (ext && ext !== "csv" && ext !== "xlsx") {
    throw new ApiError(400, "CSV_NOT_CSV", "CSV(.csv) 또는 엑셀(.xlsx) 파일만 업로드할 수 있어요.", {
      help: CSV_NOT_CSV_HELP,
      details: filename ?? undefined
    });
  }

  // 스마트스토어 리뷰 다운로드가 xlsx라, 고객이 직접 변환하지 않아도 되게 여기서 받는다.
  let csvText: string;
  if (ext === "xlsx") {
    try {
      csvText = xlsxToCsv(new Uint8Array(await file.arrayBuffer()));
      // 위 size 검사는 압축된 크기만 본다. 작은 xlsx가 거대한 시트로 펼쳐질 수 있어 다시 잰다.
      if (Buffer.byteLength(csvText, "utf8") > maxBytes) {
        throw new ApiError(413, "CSV_TOO_LARGE", "파일이 너무 커서 업로드할 수 없어요.", {
          help: CSV_TOO_LARGE_HELP
        });
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, "XLSX_UNREADABLE", "엑셀 파일을 읽지 못했어요.", {
        help: XLSX_UNREADABLE_HELP,
        details: filename ?? undefined
      });
    }
  } else {
    csvText = await file.text();
  }
  if (csvText.trim().length === 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 파일을 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (looksLikeBadEncoding(csvText)) {
    throw new ApiError(400, "CSV_ENCODING", "문자가 깨진 CSV로 보여요(인코딩 문제).", {
      help: CSV_ENCODING_HELP
    });
  }

  return { form, filename, mime, size, csvText };
}
