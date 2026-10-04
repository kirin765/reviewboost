import { zipSync } from "fflate";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * dist-firefox/ 를 AMO 제출용 ZIP 으로 묶는다 (manifest 가 ZIP 루트).
 * Node 내장 zip 이 없어 이미 의존성인 fflate 를 쓴다.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist-firefox");
const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));

const files = {};
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files[relative(dist, full).split(sep).join("/")] = readFileSync(full);
  }
}
walk(dist);

const out = resolve(root, `reviewboost-extension-firefox-${manifest.version}.zip`);
writeFileSync(out, zipSync(files, { level: 9 }));
console.log(`packaged -> ${out}`);
