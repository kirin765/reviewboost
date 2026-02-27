export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-67KE33WR4M";

declare global {
  type Gtag = (...args: unknown[]) => void;

  interface Window {
    gtag?: Gtag;
  }
}

export function pageview(url: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
}

export function gtagEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}
