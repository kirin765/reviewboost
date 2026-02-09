import { ApiError } from "@/lib/api_error";
import { CSV_EMPTY_HELP } from "@/lib/csv_errors";

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
      help: [
        "대시보드에서 파일 선택 후 업로드 버튼을 눌러주세요.",
        "엑셀/구글시트에서는 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다."
      ]
    });
  }

  const form = await req.formData();
  const file = form.get("file");
  const f: any = file;
  if (!f || typeof f !== "object") {
    throw new ApiError(400, "UPLOAD_MISSING_FILE", "업로드할 파일이 필요합니다.", {
      help: ["파일을 다시 선택해서 시도해주세요."]
    });
  }
  if (typeof f.text !== "function") {
    throw new ApiError(400, "UPLOAD_UNREADABLE_FILE", "업로드 파일을 읽을 수 없습니다.", {
      help: ["파일을 다시 선택해서 시도해주세요.", "브라우저를 새로고침한 뒤 다시 시도해보세요."]
    });
  }

  const size = typeof f.size === "number" ? f.size : null;
  if (typeof size === "number" && size <= 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 CSV를 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (typeof size === "number" && size > maxBytes) {
    throw new ApiError(413, "CSV_TOO_LARGE", "파일이 너무 커서 업로드할 수 없어요.", {
      help: ["6MB 이하로 줄이거나, CSV를 여러 파일로 나눠서 시도해주세요."]
    });
  }

  const filename = typeof f.name === "string" ? f.name : null;
  const mime = typeof f.type === "string" ? f.type : null;
  const ext = fileExt(filename);
  if (ext && ext !== "csv") {
    throw new ApiError(400, "CSV_NOT_CSV", "CSV 파일(.csv)만 업로드할 수 있어요.", {
      help: [
        "엑셀에서: 파일 > 다른 이름으로 저장 > 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장해서 업로드해주세요.",
        "구글 스프레드시트에서: 파일 > 다운로드 > '쉼표로 구분된 값(.csv)'"
      ],
      details: filename ?? undefined
    });
  }

  const csvText = await f.text();
  if (csvText.trim().length === 0) {
    throw new ApiError(400, "CSV_EMPTY", "빈 파일이에요. 내용이 있는 CSV를 올려주세요.", { help: CSV_EMPTY_HELP });
  }
  if (looksLikeBadEncoding(csvText)) {
    throw new ApiError(400, "CSV_ENCODING", "문자가 깨진 CSV로 보여요(인코딩 문제).", {
      help: [
        "엑셀에서 'CSV UTF-8'로 다시 저장해서 업로드해주세요.",
        "윈도우에서 저장한 CSV라면 인코딩이 CP949/EUC-KR일 수 있어요. UTF-8로 변환 후 다시 시도해주세요."
      ]
    });
  }

  return { form, filename, mime, size, csvText };
}
