# Source build — ReviewBoost 리뷰 수집기 (Firefox) v1.5.1

This archive is the readable source for the submitted Firefox add-on. The files in the
submitted `.zip` are generated from this source with **esbuild** (bundled + minified).

## Requirements

- Node.js 20+ (developed on Node 24)
- npm (uses the included `package-lock.json`)

## Reproduce the submitted build

```bash
npm ci
npm run build:firefox          # bundles src/ -> dist-firefox/, copies public/
# optional: npm run package:firefox  -> reviewboost-extension-firefox-1.5.1.zip
```

`dist-firefox/` is byte-for-byte the same content as the root of the submitted package.

## Source → output map

| Output (`dist-firefox/`) | Source |
|---|---|
| `manifest.json` | `public/manifest.firefox.json` |
| `service-worker.js` | `src/background/service-worker.ts` (MV3 event page, `background.scripts`) |
| `content.js` | `src/content/index.ts` + `src/content/collect-*.ts` |
| `bridge.js` | `src/content/bridge.ts` |
| `popup.js` | `src/popup/popup.ts` |
| `popup.html`, `popup.css` | `public/` |
| `icons/*` | `public/icons/*` |

Build config: `scripts/build.mjs` (esbuild IIFE, target `firefox115`, minify).

## Notes

- No remotely hosted code, no `eval()`.
- `manifest.firefox.json` has no `externally_connectable` (unsupported in Firefox);
  `bridge.js` relays `window.postMessage` from reviewboost.co.kr to the background.
- `strict_min_version` is `140.0` (MAIN-world `scripting.executeScript` needs 128+,
  built-in data-collection consent needs 140+).
