import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api_error";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  readUploadedCsvText: vi.fn()
}));

vi.mock("@/lib/upload_csv", () => ({
  readUploadedCsvText: mocks.readUploadedCsvText
}));

describe("POST /api/preview", () => {
  it("returns preview for valid CSV", async () => {
    mocks.readUploadedCsvText.mockResolvedValue({
      filename: "reviews.csv",
      csvText: ["review,rating", "좋아요,5", "별로다,2"].join("\n"),
      form: new FormData()
    });

    const res = await POST(
      new Request("https://reviewboost.app/api/preview", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.totalRows).toBe(2);
    expect(payload.columns).toEqual(["review", "rating"]);
    expect(payload.inferred.textCol).toBe("review");
  });

  it("returns csv parse error on malformed content", async () => {
    mocks.readUploadedCsvText.mockResolvedValue({
      filename: "bad.csv",
      csvText: 'review,rating\n"unclosed',
      form: new FormData()
    });

    const res = await POST(
      new Request("https://reviewboost.app/api/preview", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("CSV_PARSE_FAILED");
  });

  it("passes through upload validation errors", async () => {
    mocks.readUploadedCsvText.mockRejectedValue(new ApiError(400, "UPLOAD_MISSING_FILE", "업로드할 파일이 필요합니다."));

    const res = await POST(
      new Request("https://reviewboost.app/api/preview", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("UPLOAD_MISSING_FILE");
  });
});
