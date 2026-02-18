import { createHash } from "node:crypto";
import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const RawListingSchema = z
  .object({
    sourceId: z.union([z.string(), z.number()]).optional(),
    name: nonEmptyString,
    slug: z.string().trim().optional(),
    description: z.string().trim().optional().default(""),
    websiteUrl: z.string().trim().url().optional(),
    categoryNames: z.array(nonEmptyString).default([]),
    toolNames: z.array(nonEmptyString).default([]),
    country: nonEmptyString,
    city: nonEmptyString,
  })
  .strict();

export const RawCategorySchema = z
  .object({
    sourceId: z.union([z.string(), z.number()]).optional(),
    name: nonEmptyString,
    slug: z.string().trim().optional(),
  })
  .strict();

export const RawToolSchema = z
  .object({
    sourceId: z.union([z.string(), z.number()]).optional(),
    name: nonEmptyString,
    slug: z.string().trim().optional(),
  })
  .strict();

export type RawListing = z.input<typeof RawListingSchema>;
export type RawCategory = z.input<typeof RawCategorySchema>;
export type RawTool = z.input<typeof RawToolSchema>;

export interface SeoCategory {
  id: string;
  slug: string;
  name: string;
}

export interface SeoTool {
  id: string;
  slug: string;
  name: string;
}

export interface SeoCountry {
  id: string;
  slug: string;
  name: string;
}

export interface SeoCity {
  id: string;
  slug: string;
  name: string;
  countryId: string;
}

export interface SeoListing {
  id: string;
  slug: string;
  name: string;
  description: string;
  websiteUrl?: string;
  categoryIds: string[];
  toolIds: string[];
  countryId: string;
  cityId: string;
}

export interface SeoDirectoryData {
  listings: SeoListing[];
  categories: SeoCategory[];
  tools: SeoTool[];
  countries: SeoCountry[];
  cities: SeoCity[];
}

export class SeoDataContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeoDataContractError";
  }
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function stableId(prefix: string, ...parts: Array<string | number | undefined>): string {
  const payload = parts
    .filter((part): part is string | number => part !== undefined)
    .map((part) => String(part).trim())
    .join("|");

  const hash = createHash("sha1").update(payload).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

export function ensureSlug(name: string, fallbackPrefix: string): string {
  const slug = slugify(name);
  if (slug) return slug;

  return `${fallbackPrefix}-${stableId("slug", name).slice(-6)}`;
}

export function asContractError(scope: string, err: unknown): never {
  if (err instanceof z.ZodError) {
    const issues = err.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${scope}.${path}: ${issue.message}`;
      })
      .join("; ");
    throw new SeoDataContractError(issues);
  }

  if (err instanceof Error) {
    throw new SeoDataContractError(`${scope}: ${err.message}`);
  }

  throw new SeoDataContractError(`${scope}: Unknown validation error`);
}
