import { describe, expect, it } from "vitest";
import { detectAssistantAttribution } from "@/lib/seo/assistant-attribution";

describe("detectAssistantAttribution", () => {
  it("detects ChatGPT traffic from utm_source", () => {
    const result = detectAssistantAttribution("/", new URLSearchParams("utm_source=chatgpt.com"), "");

    expect(result).toEqual({
      assistantSource: "chatgpt",
      assistantMode: "utm",
      landingPageGroup: "home",
      contentGroup: "home",
      firstTouchPath: "/"
    });
  });

  it("detects Claude traffic from referrer", () => {
    const result = detectAssistantAttribution(
      "/blog/coupang-review-analysis",
      new URLSearchParams(""),
      "https://claude.ai/share/abc"
    );

    expect(result).toEqual({
      assistantSource: "claude",
      assistantMode: "referrer",
      landingPageGroup: "blog",
      contentGroup: "blog-article",
      firstTouchPath: "/blog/coupang-review-analysis"
    });
  });

  it("returns null for non-assistant traffic", () => {
    const result = detectAssistantAttribution("/pricing", new URLSearchParams("utm_source=newsletter"), "");
    expect(result).toBeNull();
  });
});
