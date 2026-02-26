import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import process from "node:process";

type Vulnerability = {
  name?: string;
  severity?: string;
  via?: Array<{ source?: number; title?: string; url?: string } | string>;
};

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "coverage", "dist", "storybook-static"]);
const SECRET_PATTERNS = [
  { label: "AWS access key", regex: /AKIA[0-9A-Z]{16}/g },
  { label: "GitHub PAT", regex: /ghp_[A-Za-z0-9_]{36}/g },
  { label: "GitHub fine-grained PAT", regex: /ghu_[A-Za-z0-9]{36,}/g },
  { label: "OpenAI/서비스 키 의심", regex: /sk-[a-zA-Z0-9]{48}/g },
  { label: "Private key", regex: /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/g },
  { label: "Paddle secret", regex: /PADDLE_API_KEY\s*=\s*['"][a-zA-Z0-9._-]{20,}['"]/g }
];

const ALLOWED_CVES = new Set(
  (process.env.SECURITY_ALLOWLIST_CVES ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

function listFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full));
      continue;
    }
    files.push(full);
  }

  return files;
}

function scanSecrets(filePath: string): string[] {
  let text: string;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  if (text.includes("\u0000")) return [];

  const findings: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    const matches = text.match(pattern.regex);
    if (matches) {
      findings.push(`${pattern.label}: ${matches.length}건`);
    }
  }

  return findings;
}

function assertRootAccess(filePath: string) {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runAudit(): number {
  const result = spawnSync(
    "npm",
    ["audit", "--omit=dev", "--audit-level=high", "--json"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf8"
    }
  );

  if (!result) {
    throw new Error("[CI] npm audit 실행 실패: 결과를 받지 못했습니다.");
  }

  const output = String(result.stdout || result.stderr || "");
  let parsed: { vulnerabilities?: Record<string, Vulnerability>; metadata?: { vulnerabilities?: Record<string, number> } } = {};
  try {
    parsed = output ? JSON.parse(output) : {};
  } catch {
    if (result.status !== 0) {
      throw new Error("[CI] npm audit JSON 파싱 실패: --json 출력이 예상 포맷이 아닙니다.");
    }
  }

  const metadata = parsed.metadata?.vulnerabilities ?? {};
  const metadataHigh = metadata.high ?? 0;
  const metadataCritical = metadata.critical ?? 0;

  if (result.status !== 0 || metadataHigh > 0 || metadataCritical > 0) {
    const vulnerabilities = Object.entries(parsed.vulnerabilities ?? {}).map(([name, vuln]) => {
      return { name, ...vuln };
    }) as Array<{ name: string; severity?: string; via?: Vulnerability["via"] }>;

    const hardFailures = vulnerabilities.filter((entry) => {
      const severity = entry.severity ?? "unknown";
      if (!["high", "critical"].includes(String(severity).toLowerCase())) return false;

      const cveHits = (entry.via ?? []).filter((v) => {
        const via = typeof v === "string" ? v : (v?.title ?? "");
        return !Array.from(ALLOWED_CVES).some((allowedCve) => via.includes(allowedCve));
      });
      return cveHits.length > 0;
    });

    console.error("[CI] npm audit high/critical 취약점 감지");
    for (const vuln of hardFailures) {
      console.error(`  - ${vuln.name} (severity=${vuln.severity})`);
    }

    if (hardFailures.length > 0 || result.status !== 0) {
      throw new Error(`[CI] npm audit 고위험 취약점 ${hardFailures.length}건`);
    }
  }

  console.log(`[CI] npm audit pass (high=${metadataHigh}, critical=${metadataCritical})`);
  return 0;
}

function hasCommand(command: string): boolean {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    stdio: "pipe"
  });
  return !!(result && result.status === 0);
}

function runDeepChecks() {
  const isDeep = process.argv.includes("--deep");
  if (!isDeep) return;

  const command = "gitleaks";
  if (!hasCommand(command)) {
    console.warn("[CI] gitleaks 미설치: deep secret scan은 스캔 툴 설치 후 재실행 권장");
    return;
  }

  const args = ["detect", "--source", ".", "--no-git", "--report-format", "json", "--redact", "--verbose"];
  console.log("[CI] running security deep scan (gitleaks)");
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8"
  });

  if (!result) {
    throw new Error("[CI] gitleaks 실행 실패");
  }
  if (result.status !== 0) {
    const output = String(result.stdout || result.stderr || "");
    console.error(output || "[CI] gitleaks 발견 항목이 있거나 실행 실패했습니다.");
    throw new Error("[CI] gitleaks secret scan 실패");
  }
  console.log("[CI] gitleaks deep scan pass");
}

function runSecretScan(): number {
  let secretLeaks = 0;
  const scanned = listFiles(process.cwd()).filter((filePath) => {
    const name = filePath.split(/[\\/]/).at(-1) ?? "";
    const extension = name.includes(".") ? name.split(".").at(-1)?.toLowerCase() : "";
    if (extension && ["png", "jpg", "jpeg", "gif", "webp", "ico", "mp4", "pdf", "zip", "gz", "map", "wasm"].includes(extension)) {
      return false;
    }
    return true;
  });

  for (const file of scanned) {
    const size = statSync(file).size;
    if (size > 500_000) continue;
    if (!assertRootAccess(file)) continue;

    const findings = scanSecrets(file);
    if (findings.length === 0) continue;

    secretLeaks += findings.length;
    console.error(`[CI][secret-scan] ${file}`);
    for (const line of findings) {
      console.error(`  - ${line}`);
    }
  }

  if (secretLeaks > 0) {
    console.error(`[CI] 시크릿 스캔에서 ${secretLeaks}건 의심 항목을 발견했습니다. 즉시 점검이 필요합니다.`);
    return 1;
  }
  return 0;
}

try {
  const auditCode = runAudit();
  if (auditCode !== 0) process.exit(auditCode);
  const secretCode = runSecretScan();
  if (secretCode !== 0) process.exit(secretCode);
  runDeepChecks();
} catch (error) {
  console.error("[CI] 보안 게이트 실패", error);
  process.exit(1);
}
