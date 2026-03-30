"use client";

const STEPS = [
  ["01", "파일 선택", "CSV를 업로드하거나 샘플로 시작합니다."],
  ["02", "컬럼 매핑", "리뷰, 평점, 날짜 컬럼을 확인합니다."],
  ["03", "AI 분석", "감정, 카테고리, 우선순위를 계산합니다."],
  ["04", "결과 확인", "긴급 리뷰와 액션 아이템을 검토합니다."]
] as const;

type AnalysisStepperProps = {
  step: 1 | 2 | 3 | 4;
};

export default function AnalysisStepList({ step }: AnalysisStepperProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {STEPS.map(([index, title, body], idx) => {
        const state = step === idx + 1 ? "current" : step > idx + 1 ? "done" : "idle";

        return (
          <div
            key={index}
            className={`rounded-[18px] border px-4 py-4 transition ${
              state === "current"
                ? "border-[var(--color-primary)]/50 bg-[rgba(91,108,255,0.08)]"
                : state === "done"
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-white/8 bg-transparent"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs tracking-[0.24em] ${state === "current" ? "text-white" : "text-[var(--color-muted)]"}`}>{index}</span>
              <span className="text-xs text-[var(--color-muted)]">{state === "done" ? "Complete" : state === "current" ? "In progress" : "Queued"}</span>
            </div>
            <div className="mt-4 text-base font-medium text-[var(--color-text)]">{title}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{body}</div>
          </div>
        );
      })}
    </div>
  );
}
