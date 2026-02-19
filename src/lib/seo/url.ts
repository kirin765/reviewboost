import { createHash } from "node:crypto";

const ASCII_FALLBACKS: Array<[RegExp, string]> = [
  [/ß/g, "ss"],
  [/æ/g, "ae"],
  [/œ/g, "oe"],
  [/ø/g, "o"],
  [/đ/g, "d"],
  [/ł/g, "l"],
  [/þ/g, "th"],
];

export function slugify(input: string): string {
  const lower = input.trim().toLowerCase();
  const ascii = ASCII_FALLBACKS.reduce((value, [pattern, replacement]) => {
    return value.replace(pattern, replacement);
  }, lower)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  return ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function stableHashSlug(input: string, length = 6): string {
  return createHash("sha1").update(input).digest("hex").slice(0, length);
}

export function ensureSlug(name: string, fallbackPrefix: string): string {
  const slug = slugify(name);
  if (slug) return slug;

  return `${fallbackPrefix}-${stableHashSlug(name)}`;
}

export interface SlugCandidate {
  value: string;
  key: string;
}

export function assignUniqueSlugs(
  candidates: SlugCandidate[],
  fallbackPrefix: string
): Map<string, string> {
  const entries = candidates.map((candidate) => ({
    ...candidate,
    baseSlug: ensureSlug(candidate.value, fallbackPrefix),
  }));

  entries.sort((a, b) => {
    if (a.baseSlug === b.baseSlug) {
      return a.key.localeCompare(b.key);
    }
    return a.baseSlug.localeCompare(b.baseSlug);
  });

  const counts = new Map<string, number>();
  const slugByKey = new Map<string, string>();

  for (const entry of entries) {
    const currentCount = (counts.get(entry.baseSlug) ?? 0) + 1;
    counts.set(entry.baseSlug, currentCount);

    const resolvedSlug = currentCount === 1 ? entry.baseSlug : `${entry.baseSlug}-${currentCount}`;
    slugByKey.set(entry.key, resolvedSlug);
  }

  return slugByKey;
}

export function canonicalizePath(pathOrSegments: string | string[]): string {
  const segments = Array.isArray(pathOrSegments)
    ? pathOrSegments
    : pathOrSegments.split("/").filter(Boolean);

  const cleaned = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    });

  return cleaned.length > 0 ? `/${cleaned.join("/")}` : "/";
}

export function buildCanonicalUrl(baseUrl: string, pathOrSegments: string | string[]): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
  const canonicalPath = canonicalizePath(pathOrSegments);
  if (canonicalPath === "/") {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}${canonicalPath}`;
}
