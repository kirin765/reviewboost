"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { gtagEvent } from "@/lib/analytics";
import { detectAssistantAttribution } from "@/lib/seo/assistant-attribution";

const SESSION_SOURCE_KEY = "reviewboost:assistant-source";
const SESSION_TOUCH_PATH_KEY = "reviewboost:assistant-first-touch-path";
const SESSION_RECORDED_KEY = "reviewboost:assistant-landing-recorded";

export default function AssistantAttributionEvents() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const attribution = detectAssistantAttribution(pathname, searchParams, document.referrer);
    if (!attribution) return;

    const firstTouchPath = sessionStorage.getItem(SESSION_TOUCH_PATH_KEY) ?? attribution.firstTouchPath;
    sessionStorage.setItem(SESSION_SOURCE_KEY, attribution.assistantSource);
    sessionStorage.setItem(SESSION_TOUCH_PATH_KEY, firstTouchPath);

    if (sessionStorage.getItem(SESSION_RECORDED_KEY) === "1") return;

    gtagEvent("assistant_landing", {
      assistant_source: attribution.assistantSource,
      assistant_mode: attribution.assistantMode,
      landing_page_group: attribution.landingPageGroup,
      content_group: attribution.contentGroup,
      first_touch_path: firstTouchPath
    });

    sessionStorage.setItem(SESSION_RECORDED_KEY, "1");
  }, [pathname, searchParams]);

  return null;
}
