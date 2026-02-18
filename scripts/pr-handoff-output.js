#!/usr/bin/env node

const REQUIRED_KEYS = ["PR_NUMBER", "PR_URL", "PR_BRANCH", "PR_BASE"];

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function normalize(value) {
  return String(value ?? "").trim();
}

function assertValid(metadata) {
  const missing = REQUIRED_KEYS.filter((key) => normalize(metadata[key]).length === 0);
  if (missing.length > 0) {
    throw new Error(
      `Missing required PR handoff keys: ${missing.join(", ")}. Required keys: ${REQUIRED_KEYS.join(", ")}`,
    );
  }
}

function parseOutput(output) {
  const metadata = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (REQUIRED_KEYS.includes(key)) {
      metadata[key] = normalize(value);
    }
  }
  return metadata;
}

function formatOutput(metadata) {
  return REQUIRED_KEYS.map((key) => `${key}: ${metadata[key]}`).join("\n");
}

function parseGhJson(raw) {
  const parsed = JSON.parse(raw);
  return {
    PR_NUMBER: normalize(parsed.number),
    PR_URL: normalize(parsed.url),
    PR_BRANCH: normalize(parsed.headRefName),
    PR_BASE: normalize(parsed.baseRefName),
  };
}

function run() {
  const mode = process.argv[2];

  try {
    if (mode === "from-gh-json") {
      const json = readArg("--json") ?? "";
      const metadata = parseGhJson(json);
      assertValid(metadata);
      process.stdout.write(`${formatOutput(metadata)}\n`);
      return;
    }

    if (mode === "validate") {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        input += chunk;
      });
      process.stdin.on("end", () => {
        const metadata = parseOutput(input);
        assertValid(metadata);
        process.stdout.write(`${formatOutput(metadata)}\n`);
      });
      return;
    }

    throw new Error("Usage: pr-handoff-output.js <from-gh-json|validate> [--json '<gh-pr-json>']");
  } catch (error) {
    process.stderr.write(`[pr-handoff] ${error.message}\n`);
    process.exitCode = 1;
  }
}

run();
