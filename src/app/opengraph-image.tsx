import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/og-font";

export const runtime = "nodejs";
export const alt = "ReviewBoost — 쿠팡 리뷰 AI 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fonts = await loadOgFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #5b5cea 0%, #4a3aa7 100%)",
          fontFamily: "RBKO"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              fontWeight: 700,
              color: "#ffffff"
            }}
          >
            RB
          </div>
          <span style={{ fontSize: "40px", fontWeight: 700, color: "#ffffff" }}>ReviewBoost</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: "62px", fontWeight: 700, color: "#ffffff", lineHeight: 1.14, letterSpacing: "-0.03em" }}>
            <span>리뷰에서 매출 개선 포인트를</span>
            <span>찾아내는 AI 리뷰 분석</span>
          </div>
          <span style={{ fontSize: "30px", color: "rgba(255,255,255,0.88)" }}>
            부정 키워드 TOP · 우선순위 액션 · PDF 리포트
          </span>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {[
            { k: "부정 비율", v: "32%" },
            { k: "우선순위 점수", v: "72.4" },
            { k: "분석 리뷰", v: "284건" }
          ].map((s) => (
            <div
              key={s.k}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                padding: "18px 26px",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.12)"
              }}
            >
              <span style={{ fontSize: "22px", color: "rgba(255,255,255,0.8)" }}>{s.k}</span>
              <span style={{ fontSize: "40px", fontWeight: 700, color: "#ffffff" }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) }
  );
}
