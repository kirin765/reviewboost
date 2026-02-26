import { spawnSync } from "node:child_process";
import process from "node:process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["vitest", "run", "src/lib/analysis_pipeline.perf.test.ts", "--reporter", "basic"];

const MAX_MS = Number(process.env.PERF_SMOKE_MAX_MS || "30000");
const BASELINE_MS = Number(process.env.PERF_SMOKE_BASELINE_MS || "0");
const SPIKE_RATIO = Number(process.env.PERF_SMOKE_SPIKE_RATIO || "1.5");
const MODE = (process.env.PERF_SMOKE_MODE || "strict").toLowerCase();

const result = spawnSync(command, args, {
  stdio: "pipe",
  encoding: "utf8",
  cwd: process.cwd()
});

const output = String(result.stdout || "") + String(result.stderr || "");

if (!result || result.status !== 0) {
  if (output) console.error(output);
  process.exit(result?.status ?? 1);
}

const match = output.match(/10k rows pipeline ms=(\d+)/);
if (!match || !match[1]) {
  console.error("[CI] 분석 성능 메트릭이 로그에서 발견되지 않았습니다.");
  process.exit(1);
}

const measuredMs = Number(match[1]);
const maxMs = Number.isFinite(MAX_MS) ? MAX_MS : 30000;
const baselineMs = Number.isFinite(BASELINE_MS) ? BASELINE_MS : 0;
const spikeRatio = Number.isFinite(SPIKE_RATIO) && SPIKE_RATIO > 1 ? SPIKE_RATIO : 1.5;

console.log(`[CI] performance sample: measured=${measuredMs}ms baseline=${baselineMs > 0 ? `${baselineMs}ms` : "미설정"} ratio=${baselineMs > 0 ? (measuredMs / baselineMs).toFixed(2) : "n/a"}`);

let failed = false;
if (measuredMs > maxMs) {
  console.error(`[CI] 10k 분석 경로가 허용치 초과: measured=${measuredMs}ms > max=${maxMs}ms`);
  failed = true;
}
if (baselineMs > 0 && measuredMs > baselineMs * spikeRatio) {
  console.error(`[CI] 10k 분석 경로가 기준선 대비 과도하게 증가: measured=${measuredMs}ms, baseline=${baselineMs}ms, ratio>${spikeRatio}`);
  failed = true;
}

if (failed && MODE === "warn") {
  console.warn("[CI] PERF_SMOKE_MODE=warn로 경고 모드로 처리합니다.");
  process.exit(0);
}

process.exit(failed ? 1 : 0);
