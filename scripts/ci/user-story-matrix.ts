import { accessSync } from "node:fs";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

type StoryGate = "merge-blocking" | "non-blocking" | "nightly";

type StoryMapping = {
  id: string;
  slug: string;
  title: string;
  description: string;
  scope: string[];
  tests: string[];
  gate: StoryGate;
  criteria: string[];
};

type CliOptions = {
  runAll: boolean;
  validateOnly: boolean;
  runStory: string | null;
  gateFilter: StoryGate | "all" | null;
  printUsage: boolean;
};

const ROOT = process.cwd();
const VITEST_COMMAND = "vitest";

const userStories: StoryMapping[] = [
  {
    id: "US-01",
    slug: "us-01",
    title: "업로드/미리보기",
    description: "CSV 업로드와 preview 파싱 규칙이 일관되게 동작해야 한다.",
    scope: ["/api/preview", "csv"],
    tests: [
      "src/app/api/preview/route.test.ts",
      "src/lib/csv.test.ts",
      "src/lib/contracts.test.ts"
    ],
    gate: "merge-blocking",
    criteria: [
      "유효 CSV에서 미리보기가 성공",
      "잘못된 MIME/빈 파일/인코딩 에러가 표준 형식으로 반환",
      "delimiter 추론/헤더 판별 경계값이 스모크 처리"
    ]
  },
  {
    id: "US-02",
    slug: "us-02",
    title: "분석 실행 기본",
    description: "요청 기반 분석 파이프라인이 plan/LLM 정책을 반영해 안정적으로 완료되어야 한다.",
    scope: ["/api/analyze", "analysis_pipeline"],
    tests: [
      "src/app/api/analyze/route.test.ts",
      "src/lib/analysis_pipeline.test.ts",
      "src/lib/analysis_pipeline.perf.test.ts"
    ],
    gate: "merge-blocking",
    criteria: [
      "파싱 실패·빈 데이터가 에러 코드로 반환",
      "유효 요청은 분석 응답 반환",
      "NaN/무한대가 통계·점수에서 발생하지 않음"
    ]
  },
  {
    id: "US-03",
    slug: "us-03",
    title: "LLM 장애 폴백",
    description: "OpenAI 실패 시 휴리스틱 폴백으로 분석이 유지되어야 한다.",
    scope: ["openai_classify", "openai_suggestions"],
    tests: [
      "src/lib/openai_classify.test.ts",
      "src/lib/openai_suggestions.test.ts",
      "src/lib/analysis_pipeline.test.ts"
    ],
    gate: "merge-blocking",
    criteria: [
      "분류 실패 시 heuristic fallback",
      "제안 생성 실패 시 템플릿 fallback",
      "타임아웃/파싱 실패 로그 진단이 누적"
    ]
  },
  {
    id: "US-04",
    slug: "us-04",
    title: "저장 실패 회복",
    description: "DB 저장 실패 시에도 분석 응답이 반환되어야 한다.",
    scope: ["analysis_repository", "/api/analyze"],
    tests: ["src/app/api/analyze/route.test.ts"],
    gate: "merge-blocking",
    criteria: [
      "storageAttempted=true/false 표기",
      "저장 실패의 에러 코드가 표준 meta로 노출",
      "저장 예외가 200 응답을 깨지지 않음"
    ]
  },
  {
    id: "US-05",
    slug: "us-05",
    title: "웹훅/결제 안정성",
    description: "결제 이벤트가 중복/누락/미맵핑이어도 안전하게 처리되어야 한다.",
    scope: ["/api/billing/webhook", "/api/billing/checkout", "billing"],
    tests: [
      "src/app/api/billing/webhook/route.test.ts",
      "src/app/api/billing/checkout/route.test.ts",
      "src/lib/billing.test.ts",
      "src/lib/paddle.test.ts"
    ],
    gate: "non-blocking",
    criteria: [
      "서명 오류/비밀 누락에서 표준 응답",
      "중복 이벤트/순서 꼬임 로그 추적성",
      "customer_id 매핑 누락 케이스 처리"
    ]
  },
  {
    id: "US-06",
    slug: "us-06",
    title: "리포트 생성/다운로드",
    description: "리포트 생성 API가 성공/실패 스키마를 일관된 헤더로 반환해야 한다.",
    scope: ["/api/report", "/api/report/[id]"],
    tests: [
      "src/app/api/report/route.test.ts",
      "src/app/api/report/[id]/route.test.ts",
      "src/lib/contracts.test.ts"
    ],
    gate: "merge-blocking",
    criteria: [
      "성공 응답이 pdf 헤더/파일명으로 반환",
      "실패 응답에 x-report-renderer/failure 헤더 존재",
      "contract 스키마 검증"
    ]
  }
];

function parseCliOptions(argv: string[]): CliOptions {
  const flags = new Set(argv.map((item) => item.trim()));

  let runStory: string | null = null;
  let gateFilter: StoryGate | "all" | null = null;
  let runAll = flags.has("--run-all") || flags.has("--all");
  const printUsage = flags.has("--help") || flags.has("-h") || flags.has("--usage");

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--story" || arg === "--slug") && i + 1 < argv.length) {
      runStory = argv[i + 1]!.toLowerCase();
      continue;
    }
    if (arg === "--run" && i + 1 < argv.length) {
      const candidate = argv[i + 1]?.toLowerCase();
      if (candidate) {
        if (/^us-\d{2}$/i.test(candidate) || /^us-\d$/.test(candidate)) {
          runStory = candidate;
        } else {
          runAll = true;
        }
      }
      continue;
    }
    if ((arg === "--gate" || arg === "--g") && i + 1 < argv.length) {
      const candidate = argv[i + 1]?.toLowerCase();
      if (candidate === "merge-blocking" || candidate === "non-blocking" || candidate === "nightly" || candidate === "all") {
        gateFilter = candidate as StoryGate | "all";
      } else {
        console.error(`[CI] 알 수 없는 게이트: ${candidate}`);
      }
    }
  }

  const validateOnly = flags.has("--validate") || flags.has("--check");

  return {
    runAll,
    runStory,
    validateOnly,
    gateFilter: gateFilter ?? null,
    printUsage
  };
}

function resolveStoryFile(filePath: string): string {
  return path.resolve(ROOT, filePath);
}

function validateStoryFiles(stories: StoryMapping[]): string[] {
  const missing = new Set<string>();
  for (const story of stories) {
    for (const testPath of story.tests) {
      try {
        accessSync(resolveStoryFile(testPath), constants.F_OK);
      } catch {
        missing.add(testPath);
      }
    }
  }
  return [...missing];
}

function normalizeStorySlug(slug: string) {
  return slug.trim().toLowerCase();
}

function findStoryBySlug(raw: string): StoryMapping | undefined {
  const target = normalizeStorySlug(raw);
  return userStories.find((story) => story.slug === target || story.id.toLowerCase() === target);
}

function printMatrix(stories = userStories) {
  for (const story of stories) {
    console.log(`${story.id} | ${story.title} | gate=${story.gate}`);
    console.log(`  scope: ${story.scope.join(", ")}`);
    console.log(`  tests: ${story.tests.join(", ")}`);
    console.log(`  criteria: ${story.criteria.join("; ")}`);
  }
}

function printUsage() {
  console.log("USAGE: node --experimental-strip-types scripts/ci/user-story-matrix.ts [옵션]");
  console.log("  --run-all                모든 스토리 테스트 실행");
  console.log("  --story <slug|id>        특정 스토리만 실행 (예: us-01)");
  console.log("  --gate <merge-blocking|non-blocking|nightly|all>  스토리 게이트로 필터링");
  console.log("  --validate, --check      매핑된 테스트 경로 존재 검사");
  console.log("  --run-all --validate     병행 실행 가능한지 사전 점검");
  console.log("  --help                   매핑 목록/옵션 출력");
  console.log("");
  printMatrix();
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    encoding: "utf8"
  });

  if (!result) {
    console.error("[CI] 테스트 실행 실패: spawn 결과 없음");
    return 1;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    return result.status;
  }

  return 0;
}

function runStories(stories: StoryMapping[]) {
  const tests = Array.from(new Set(stories.flatMap((story) => story.tests)));
  if (tests.length === 0) {
    console.log("[CI] 실행할 사용자 스토리 테스트가 없습니다.");
    return 0;
  }

  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return runCommand(command, [VITEST_COMMAND, "run", ...tests]);
}

function runMatrixMode(options: CliOptions) {
  const filtered = options.gateFilter === null || options.gateFilter === "all"
    ? userStories
    : userStories.filter((story) => story.gate === options.gateFilter);

  const selectedBySlug = options.runStory ? findStoryBySlug(options.runStory) : null;
  if (options.runStory && !selectedBySlug) {
    console.error(`[CI] 알 수 없는 스토리 slug/id: ${options.runStory}`);
    return 1;
  }

  const storiesToRun = selectedBySlug ? [selectedBySlug] : options.runAll ? [...filtered] : [];
  const shouldExecute = options.runAll || Boolean(options.runStory);

  if (!shouldExecute) {
    const storyMatrixToCheck = options.gateFilter === null ? userStories : filtered;
    const missing = validateStoryFiles(storyMatrixToCheck);
    if (missing.length > 0) {
      console.error("[CI] 사용자 스토리 테스트 파일이 누락되었습니다.");
      for (const file of missing) {
        console.error(` - ${file}`);
      }
      return 1;
    }

    if (options.validateOnly) {
      console.log("[CI] 사용자 스토리 매핑 + 테스트 파일 존재 검증 통과");
    }
    return 0;
  }

  const missing = validateStoryFiles(storiesToRun);
  if (missing.length > 0) {
    console.error("[CI] 사용자 스토리 테스트 파일이 누락되었습니다.");
    for (const file of missing) {
      console.error(` - ${file}`);
    }
    return 1;
  }

  if (options.validateOnly) {
    console.log(`[CI] 대상 스토리 테스트 경로 검증 통과: ${storiesToRun.map((s) => s.id).join(", ")}`);
    return shouldExecute ? runStories(storiesToRun) : 0;
  }

  return runStories(storiesToRun);
}

function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.printUsage) {
    printUsage();
    return;
  }

  const exitCode = runMatrixMode(options);
  if (exitCode !== 0) process.exit(exitCode);

  if (!options.runAll && !options.runStory && !options.validateOnly) {
    console.log("[CI] 실행 모드 미지정: --run-all 또는 --story, --validate 중 하나를 지정하세요.");
    printMatrix();
  }
}

main();
