import fs from "node:fs";
import path from "node:path";

type OgFont = { name: string; data: Buffer; weight: 400; style: "normal" };

let cached: OgFont[] | null | undefined;

/** Loads the bundled Korean font for next/og so Hangul renders instead of tofu boxes. */
export async function loadOgFont(): Promise<OgFont[] | null> {
  if (cached !== undefined) return cached;
  const candidates = [
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.ttf"),
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.otf")
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        cached = [{ name: "RBKO", data: fs.readFileSync(file), weight: 400, style: "normal" }];
        return cached;
      }
    } catch {
      // ignore and try next
    }
  }
  cached = null;
  return cached;
}
