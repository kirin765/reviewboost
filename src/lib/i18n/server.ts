import { cookies } from "next/headers";
import type { Locale, Dictionary } from "./types";
import ko from "./ko";
import en from "./en";

const dictionaries: Record<Locale, Dictionary> = { ko, en };
const COOKIE_NAME = "rb_locale";

export async function getServerLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIE_NAME)?.value;
    if (value === "en" || value === "ko") return value;
  } catch {
    // cookies() may throw outside request context
  }
  return "ko";
}

export async function getServerTranslation() {
  const locale = await getServerLocale();
  const dict = dictionaries[locale] ?? dictionaries.ko;

  function t(key: string, params?: Record<string, string | number>): string {
    let value = dict[key] ?? dictionaries.ko[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return value;
  }

  return { t, locale };
}
