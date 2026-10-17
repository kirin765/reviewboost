import React from "react";
import { ImageResponse } from "next/og";
import { extensionProduct } from "@/lib/extension-content";

export const alt = "ReviewBoost Review Collector — Export product reviews to Excel and CSV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function ExtensionOpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#f7f8fc", color: "#1f2540", padding: 72 }}>
      <div style={{ display: "flex", fontSize: 32, color: "#5b5cea", fontWeight: 700 }}>ReviewBoost · Chrome Extension</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", fontSize: 70, fontWeight: 700 }}>Product reviews.</div>
        <div style={{ display: "flex", fontSize: 70, fontWeight: 700 }}>Ready for Excel & CSV.</div>
      </div>
      <div style={{ display: "flex", fontSize: 28 }}>Coupang · Naver Smart Store · {extensionProduct.platforms.length} shopping platforms</div>
      <div style={{ display: "flex", fontSize: 24, color: "#5b5cea" }}>reviewboost.co.kr/extension</div>
    </div>,
    size
  );
}
