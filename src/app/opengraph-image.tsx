import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ReviewBoost - AI 리뷰 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #5b5cea 0%, #ff7a66 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            RB
          </div>
          <span
            style={{
              fontSize: "64px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            ReviewBoost
          </span>
        </div>
        <span
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 500,
          }}
        >
          AI 리뷰 분석 · 우선순위 액션 제안 · PDF 리포트
        </span>
      </div>
    ),
    { ...size }
  );
}
