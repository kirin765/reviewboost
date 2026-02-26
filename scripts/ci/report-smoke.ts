import { accessSync } from "node:fs";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import process from "node:process";

const TESTS = ["src/app/api/report/route.test.ts", "src/app/api/report/[id]/route.test.ts"];

function ensureTests() {
  for (const file of TESTS) {
    try {
      accessSync(file, constants.F_OK);
    } catch {
      console.error(`[CI] 리포트 smoke 테스트 파일이 없습니다: ${file}`);
      process.exit(1);
    }
  }
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    encoding: "utf8",
    cwd: process.cwd()
  });

  if (!result) {
    console.error("[CI] report smoke command spawn failed");
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureTests();
runCommand(process.platform === "win32" ? "npx.cmd" : "npx", [
  "vitest",
  "run",
  ...TESTS
]);
