import { promises as fs } from "node:fs";
import path from "node:path";

import {
  RawCategorySchema,
  RawListingSchema,
  RawToolSchema,
  SeoCategory,
  SeoCity,
  SeoCountry,
  SeoDataContractError,
  SeoDirectoryData,
  SeoListing,
  SeoTool,
  asContractError,
  ensureSlug,
  stableId,
} from "@/lib/seo/data-contract";

export interface SeoSourcePayload {
  listings: unknown[];
  categories?: unknown[];
  tools?: unknown[];
}

export interface SeoLoaderOptions {
  filePath?: string;
  payload?: SeoSourcePayload;
}

function loadCategory(raw: unknown, index: number): SeoCategory {
  try {
    const parsed = RawCategorySchema.parse(raw);
    return {
      id: stableId("cat", parsed.sourceId ?? parsed.slug ?? parsed.name),
      slug: ensureSlug(parsed.slug ?? parsed.name, "category"),
      name: parsed.name,
    };
  } catch (err) {
    asContractError(`categories[${index}]`, err);
  }
}

function loadTool(raw: unknown, index: number): SeoTool {
  try {
    const parsed = RawToolSchema.parse(raw);
    return {
      id: stableId("tool", parsed.sourceId ?? parsed.slug ?? parsed.name),
      slug: ensureSlug(parsed.slug ?? parsed.name, "tool"),
      name: parsed.name,
    };
  } catch (err) {
    asContractError(`tools[${index}]`, err);
  }
}

function byName<T extends { name: string }>(items: T[], label: string): Map<string, T> {
  const map = new Map<string, T>();

  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    if (map.has(key)) {
      throw new SeoDataContractError(`${label}: duplicate name \"${item.name}\"`);
    }
    map.set(key, item);
  }

  return map;
}

export function normalizeSeoDirectoryData(payload: SeoSourcePayload): SeoDirectoryData {
  const categories: SeoCategory[] = (payload.categories ?? []).map(loadCategory);
  const tools: SeoTool[] = (payload.tools ?? []).map(loadTool);

  const categoriesByName = byName(categories, "categories");
  const toolsByName = byName(tools, "tools");

  const countriesByName = new Map<string, SeoCountry>();
  const citiesByCountryAndName = new Map<string, SeoCity>();
  const listings: SeoListing[] = payload.listings.map((raw, index) => {
    let parsed;
    try {
      parsed = RawListingSchema.parse(raw);
    } catch (err) {
      asContractError(`listings[${index}]`, err);
    }

    const countryKey = parsed.country.trim().toLowerCase();
    let country = countriesByName.get(countryKey);
    if (!country) {
      country = {
        id: stableId("country", parsed.country),
        slug: ensureSlug(parsed.country, "country"),
        name: parsed.country,
      };
      countriesByName.set(countryKey, country);
    }

    const cityKey = `${country.id}:${parsed.city.trim().toLowerCase()}`;
    let city = citiesByCountryAndName.get(cityKey);
    if (!city) {
      city = {
        id: stableId("city", country.id, parsed.city),
        slug: ensureSlug(parsed.city, "city"),
        name: parsed.city,
        countryId: country.id,
      };
      citiesByCountryAndName.set(cityKey, city);
    }

    const categoryIds = parsed.categoryNames.map((name) => {
      const category = categoriesByName.get(name.trim().toLowerCase());
      if (!category) {
        throw new SeoDataContractError(
          `listings[${index}].categoryNames: unknown category \"${name}\"`
        );
      }
      return category.id;
    });

    const toolIds = parsed.toolNames.map((name) => {
      const tool = toolsByName.get(name.trim().toLowerCase());
      if (!tool) {
        throw new SeoDataContractError(`listings[${index}].toolNames: unknown tool \"${name}\"`);
      }
      return tool.id;
    });

    return {
      id: stableId("listing", parsed.sourceId ?? parsed.slug ?? `${parsed.name}|${city.id}`),
      slug: ensureSlug(parsed.slug ?? parsed.name, "listing"),
      name: parsed.name,
      description: parsed.description,
      websiteUrl: parsed.websiteUrl,
      categoryIds: Array.from(new Set(categoryIds)),
      toolIds: Array.from(new Set(toolIds)),
      countryId: country.id,
      cityId: city.id,
    };
  });

  return {
    listings,
    categories,
    tools,
    countries: Array.from(countriesByName.values()),
    cities: Array.from(citiesByCountryAndName.values()),
  };
}

export async function loadSeoDirectoryData(options: SeoLoaderOptions = {}): Promise<SeoDirectoryData> {
  if (options.payload) {
    return normalizeSeoDirectoryData(options.payload);
  }

  const filePath = options.filePath ?? path.join(process.cwd(), "data", "seo", "directory.json");

  let parsed: SeoSourcePayload;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    parsed = JSON.parse(raw) as SeoSourcePayload;
  } catch (err) {
    asContractError(`source(${filePath})`, err);
  }

  return normalizeSeoDirectoryData(parsed);
}
