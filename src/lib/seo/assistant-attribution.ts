import { getContentGroup, getLandingPageGroup } from "@/lib/seo/page-registry";

export type AssistantSource = "chatgpt" | "claude" | "perplexity" | "gemini" | "copilot";
export type AssistantMode = "utm" | "referrer";

type SearchParamsLike = {
  get(name: string): string | null;
};

const REFERRER_HOSTS: Record<string, AssistantSource> = {
  "chatgpt.com": "chatgpt",
  "claude.ai": "claude",
  "perplexity.ai": "perplexity",
  "gemini.google.com": "gemini",
  "copilot.microsoft.com": "copilot"
};

function normalizeHost(input: string) {
  return input.trim().toLowerCase().replace(/^www\./, "");
}

function sourceFromUtm(value: string | null): AssistantSource | null {
  const normalized = normalizeHost(value ?? "");
  if (normalized === "chatgpt.com" || normalized === "chatgpt") return "chatgpt";
  if (normalized === "claude.ai" || normalized === "claude") return "claude";
  if (normalized === "perplexity.ai" || normalized === "perplexity") return "perplexity";
  if (normalized === "gemini.google.com" || normalized === "gemini") return "gemini";
  if (normalized === "copilot.microsoft.com" || normalized === "copilot") return "copilot";
  return null;
}

function sourceFromReferrer(referrer: string) {
  try {
    const url = new URL(referrer);
    const host = normalizeHost(url.hostname);
    return REFERRER_HOSTS[host] ?? null;
  } catch {
    return null;
  }
}

export function detectAssistantAttribution(
  pathname: string,
  searchParams: SearchParamsLike,
  referrer: string
) {
  const utmSource = sourceFromUtm(searchParams.get("utm_source"));
  if (utmSource) {
    return {
      assistantSource: utmSource,
      assistantMode: "utm" as const,
      landingPageGroup: getLandingPageGroup(pathname),
      contentGroup: getContentGroup(pathname),
      firstTouchPath: pathname
    };
  }

  const referrerSource = sourceFromReferrer(referrer);
  if (!referrerSource) return null;

  return {
    assistantSource: referrerSource,
    assistantMode: "referrer" as const,
    landingPageGroup: getLandingPageGroup(pathname),
    contentGroup: getContentGroup(pathname),
    firstTouchPath: pathname
  };
}
