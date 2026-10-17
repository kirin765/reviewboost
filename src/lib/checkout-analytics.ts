import { GA_MEASUREMENT_ID, initializeAnalytics } from "@/lib/analytics";
import { sanitizeCheckoutAttribution } from "@/lib/checkout-attribution";

const KEY = "reviewboost:acquisition:v1";
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function captureAcquisition() {
  if (typeof window === "undefined") return {};
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (saved && typeof saved.at === "number" && Date.now() - saved.at >= 0 && Date.now() - saved.at < MAX_AGE) {
      return sanitizeCheckoutAttribution(saved.data);
    }
    const params = new URLSearchParams(window.location.search);
    const referrer = document.referrer ? new URL(document.referrer).hostname : "";
    const external = referrer && referrer !== window.location.hostname;
    const data = sanitizeCheckoutAttribution({
      acquisition_source: params.get("utm_source") || (external ? referrer : "direct"),
      acquisition_medium: params.get("utm_medium") || (external ? "referral" : "none"),
      acquisition_campaign: params.get("utm_campaign") || undefined
    });
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch { return {}; }
}

export async function getCheckoutAnalytics(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const acquisition = captureAcquisition();
  initializeAnalytics();
  const get = (field: string) => new Promise<string | undefined>(resolve => {
    const timer = setTimeout(() => resolve(undefined), 800);
    window.gtag?.("get", GA_MEASUREMENT_ID, field, (value: unknown) => {
      clearTimeout(timer);
      resolve(typeof value === "string" || typeof value === "number" ? String(value) : undefined);
    });
  });
  const [clientId, sessionId] = await Promise.all([get("client_id"), get("session_id")]);
  return sanitizeCheckoutAttribution({ ...acquisition, ga_client_id: clientId, ga_session_id: sessionId });
}
