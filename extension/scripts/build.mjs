import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = resolve(root, "dist");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

// Each entry is bundled into a self-contained IIFE so MV3 content scripts /
// service worker / popup load with no runtime imports or shared chunks.
const entries = [
  { in: "src/content/index.ts", out: "content" },
  { in: "src/background/service-worker.ts", out: "service-worker" },
  { in: "src/popup/popup.ts", out: "popup" }
];

await Promise.all(
  entries.map((e) =>
    build({
      entryPoints: [resolve(root, e.in)],
      outfile: resolve(outdir, `${e.out}.js`),
      bundle: true,
      format: "iife",
      target: "chrome110",
      minify: true,
      legalComments: "none"
    })
  )
);

// Copies manifest, popup.html/css, and icons/ (real PNGs live in public/icons).
cpSync(resolve(root, "public"), outdir, { recursive: true });

console.log(`built -> ${outdir}`);
