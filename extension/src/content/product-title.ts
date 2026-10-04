import type { Platform } from "../lib/types";

/** Never export a marketplace/error-page label as the product's name. */
export function productTitle(doc: Document, platform: Platform | null): string {
  if (platform !== "coupang") return doc.title;

  const clean = (value: string | null | undefined): string => {
    const title = (value ?? "").replace(/\s+/g, " ").trim()
      .replace(/\s*[-|–]\s*(?:쿠팡!?|coupang!?)\s*$/i, "").trim();
    if (/^(?:쿠팡!?|coupang!?|access denied|접근 제한|오류)$/i.test(title)) return "";
    return title;
  };

  // The document title can remain "쿠팡!", including on access-denied pages.
  // Prefer the product heading, then product social metadata, then a specific title.
  const candidates = [
    doc.querySelector(".prod-buy-header__title")?.textContent,
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    doc.title
  ];
  return candidates.map(clean).find(Boolean) ?? "";
}
