export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-67KE33WR4M";

declare global {
  type Gtag = (...args: unknown[]) => void;
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    reviewboostGaConfigured?: boolean;
  }
}

/** Retain campaign labels but never send login tickets or arbitrary return parameters. */
export function analyticsPageUrl(raw: string) {
  const url = new URL(raw, window.location.origin);
  const safe = new URL(url.pathname, window.location.origin);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = url.searchParams.get(key);
    if (value && /^[\p{L}\p{N}_.() /-]{1,100}$/u.test(value)) safe.searchParams.set(key, value);
  }
  return safe;
}

/** Queue early events instead of discarding them before the deferred Google tag loads. */
export function initializeAnalytics() {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments); };
  if (!window.reviewboostGaConfigured) {
    window.reviewboostGaConfigured = true;
    window.gtag("js", new Date());
    // Page views are sent explicitly once per route below.
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      page_location: analyticsPageUrl(window.location.href).href,
      page_referrer: document.referrer ? new URL(document.referrer).origin : ""
    });
  }
}

export function pageview(url: string) {
  initializeAnalytics();
  if (typeof window === "undefined") return;
  const safe = analyticsPageUrl(url);
  window.gtag?.("event", "page_view", { page_path: `${safe.pathname}${safe.search}`, page_location: safe.href });
}

export function gtagEvent(eventName: string, params: Record<string, unknown> = {}) {
  initializeAnalytics();
  if (typeof window === "undefined") return;
  window.gtag?.("event", eventName, params);
}
