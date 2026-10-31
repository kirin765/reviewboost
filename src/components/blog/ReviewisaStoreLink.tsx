"use client";

import React, { type ReactNode } from "react";
import { gtagEvent } from "@/lib/analytics";
import { goPath } from "@/lib/go-links";

/**
 * 블로그 CTA → 클릭 측정 리디렉션(`/go/...`) → 카페24 앱스토어.
 * 서버 집계(`funnel_events`)와 GA4 이벤트를 함께 남긴다.
 */
export default function ReviewisaStoreLink({ placement, children }: {
  placement: "guide_steps" | "guide_end";
  children: ReactNode;
}) {
  return (
    <a
      href={goPath("reviewisa-cafe24-blog")}
      className="underline underline-offset-4"
      onClick={() => gtagEvent("reviewisa_store_click", { placement })}
    >
      {children}
    </a>
  );
}
