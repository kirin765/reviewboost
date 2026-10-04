import { build } from "esbuild";
import { copyFileSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = (process.argv[2] || "chrome").toLowerCase();

if (!["chrome", "firefox", "all"].includes(target)) {
  console.error(`unknown build target "${target}" — expected chrome | firefox | all`);
  process.exit(1);
}

/**
 * Chrome(MV3 service worker)과 Firefox(MV3 event page + postMessage 브리지)는
 * manifest 와 background 형태가 다르다:
 *  - Chrome: background.service_worker + externally_connectable
 *  - Firefox: background.scripts + reviewboost.co.kr 브리지 content script
 *    (Firefox 는 externally_connectable 미지원 — bug 1319168, MAIN world 는 128+)
 */
async function buildBrowser(browser) {
  const isFirefox = browser === "firefox";
  const manifestFile = isFirefox ? "manifest.firefox.json" : "manifest.json";
  const outdir = resolve(root, isFirefox ? "dist-firefox" : "dist");

  rmSync(outdir, { recursive: true, force: true });
  mkdirSync(outdir, { recursive: true });

  // Each entry is bundled into a self-contained IIFE so MV3 content scripts /
  // background / popup load with no runtime imports or shared chunks.
  const entries = [
    { in: "src/content/index.ts", out: "content" },
    { in: "src/background/service-worker.ts", out: "service-worker" },
    { in: "src/popup/popup.ts", out: "popup" },
    ...(isFirefox ? [{ in: "src/content/bridge.ts", out: "bridge" }] : [])
  ];

  await Promise.all(
    entries.map((e) =>
      build({
        entryPoints: [resolve(root, e.in)],
        outfile: resolve(outdir, `${e.out}.js`),
        bundle: true,
        format: "iife",
        target: isFirefox ? "firefox115" : "chrome110",
        minify: true,
        legalComments: "none"
      })
    )
  );

  // Copies manifest, popup.html/css, and icons/ (real PNGs live in public/icons).
  cpSync(resolve(root, "public"), outdir, { recursive: true });
  rmSync(resolve(outdir, "manifest.firefox.json"), { force: true });
  if (isFirefox) {
    copyFileSync(resolve(root, "public", manifestFile), resolve(outdir, "manifest.json"));
  }

  console.log(`built ${browser} -> ${outdir}`);
}

if (target === "chrome" || target === "all") await buildBrowser("chrome");
if (target === "firefox" || target === "all") await buildBrowser("firefox");
