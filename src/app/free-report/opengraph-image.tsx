import { ImageResponse } from "next/og";
import { loadOgFont } from "@/lib/og-font";

export const runtime = "nodejs";
export const alt = "쿠팡 상품 URL로 무료 리뷰 리포트 — ReviewBoost";
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
          justifyContent: "center",
          gap: "28px",
          padding: "80px",
          background: "linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%)",
          fontFamily: "RBKO"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#5b5cea",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              color: "#ffffff"
            }}
          >
            RB
          </div>
          <span style={{ fontSize: "32px", fontWeight: 700, color: "#1f2559" }}>ReviewBoost</span>
          <span style={{ fontSize: "22px", color: "#7c83ab" }}>무료 리뷰 리포트</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: "66px", fontWeight: 700, color: "#1f2559", lineHeight: 1.12, letterSpacing: "-0.04em" }}>
          <span>쿠팡 상품 URL만 넣으면</span>
          <span>부정 키워드 TOP을 무료로</span>
        </div>
        <span style={{ fontSize: "30px", color: "#5b5cea", fontWeight: 700 }}>
          회원가입 없이 바로 분석 · reviewboost.co.kr
        </span>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) }
  );
}
