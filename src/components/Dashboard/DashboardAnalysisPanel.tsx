"use client";

import type { Capabilities } from "@/lib/capabilities";
import type { CsvPreview } from "@/lib/csv";
import FileUploader from "./FileUploader";
import CsvPreviewComponent from "./CsvPreview";

interface DashboardAnalysisPanelProps {
  file: File | null;
  busy: boolean;
  preview: CsvPreview | null;
  textCol: string;
  ratingCol: string;
  dateCol: string;
  showAllPreviewCols: boolean;
  cellModal: { col: string; value: string } | null;
  caps: Capabilities | null;
  step: 1 | 2 | 3 | 4;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
  onSample: () => void;
  onAnalyze: () => void;
  onTextColChange: (col: string) => void;
  onRatingColChange: (col: string) => void;
  onDateColChange: (col: string) => void;
  onTogglePreviewCols: () => void;
  onCellClick: (col: string, value: string) => void;
  onCellModalClose: () => void;
}

function StepPage({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(26,26,26,0.94),rgba(16,16,16,0.96))] p-6 md:p-8">
      <div className="max-w-[720px]">
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">{title}</h2>
        <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">{description}</p>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function DashboardAnalysisPanel({
  file,
  busy,
  preview,
  caps,
  step,
  textCol,
  ratingCol,
  dateCol,
  showAllPreviewCols,
  cellModal,
  onFileSelect,
  onReset,
  onSample,
  onAnalyze,
  onTextColChange,
  onRatingColChange,
  onDateColChange,
  onTogglePreviewCols,
  onCellClick,
  onCellModalClose
}: DashboardAnalysisPanelProps) {
  if (step === 1) {
    return (
      <StepPage title="CSV 파일을 업로드합니다" description="첫 단계에서는 분석할 리뷰 데이터를 넣습니다. 샘플로 바로 테스트하거나 업로드를 시작할 수 있습니다.">
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[22px] border border-white/[0.06] bg-black/20 p-5">
            <FileUploader file={file} busy={busy} preview={Boolean(preview)} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} onAnalyze={onAnalyze} />
          </div>
          <div className="rounded-[22px] border border-white/[0.06] bg-black/15 p-8">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white">Step 1</div>
            <h3 className="mt-4 text-[28px] font-medium tracking-[-0.04em] text-white">입력만 끝내면 다음 단계로 넘어갑니다.</h3>
            <div className="mt-5 space-y-3 text-base leading-8 text-[var(--color-muted)]">
              <p>상품 리뷰 CSV를 업로드합니다.</p>
              <p>샘플 파일로 바로 분석 흐름을 체험할 수 있습니다.</p>
              <p>업로드가 끝나면 하단 화면이 컬럼 확인 화면으로 바뀝니다.</p>
            </div>
          </div>
        </div>
      </StepPage>
    );
  }

  if (step === 2 && preview) {
    return (
      <StepPage title="컬럼을 확인하고 분석 준비를 마칩니다" description="리뷰 텍스트, 평점, 날짜 컬럼을 확인하면 분석 준비가 끝납니다. 준비가 끝나면 다음 단계에서 AI 분석이 진행됩니다.">
        <CsvPreviewComponent
          preview={preview}
          busy={busy}
          textCol={textCol}
          ratingCol={ratingCol}
          dateCol={dateCol}
          showAllPreviewCols={showAllPreviewCols}
          cellModal={cellModal}
          onTextColChange={onTextColChange}
          onRatingColChange={onRatingColChange}
          onDateColChange={onDateColChange}
          onTogglePreviewCols={onTogglePreviewCols}
          onCellClick={onCellClick}
          onCellModalClose={onCellModalClose}
        />
      </StepPage>
    );
  }

  return (
    <StepPage title="AI 분석을 실행합니다" description="현재 설정된 리뷰 컬럼 기준으로 감정 분석, 카테고리 분류, 우선순위 계산을 진행합니다. 분석이 끝나면 하단 화면이 결과 화면으로 바뀝니다.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[22px] border border-white/[0.06] bg-black/20 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">플랜</div>
              <div className="mt-2 text-xl font-medium text-white">{caps?.planLabel ?? "Guest"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">파일</div>
              <div className="mt-2 text-xl font-medium text-white">{file?.name ?? "sample.csv"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">저장</div>
              <div className="mt-2 text-xl font-medium text-white">{caps?.supabaseConfigured === false ? "비활성화" : "가능"}</div>
            </div>
          </div>
          <button
            type="button"
            className="mt-8 inline-flex items-center justify-center rounded-[16px] bg-[var(--color-primary)] px-5 py-3 text-base font-semibold text-white disabled:opacity-50"
            onClick={onAnalyze}
            disabled={busy}
          >
            {busy ? "분석 중..." : "AI 분석 실행"}
          </button>
        </div>

        <div className="rounded-[22px] border border-white/[0.06] bg-[#0c0c0d] p-6 font-mono text-sm">
          <div className={busy ? "text-emerald-300" : "text-[var(--color-text-tertiary)]"}>1. 리뷰 수집 중...</div>
          <div className={`mt-3 ${busy ? "text-emerald-300" : "text-[var(--color-text-tertiary)]"}`}>2. 감정 분석 진행 중...</div>
          <div className={`mt-3 ${busy ? "text-emerald-300" : "text-[var(--color-text-tertiary)]"}`}>3. 카테고리 분류 중...</div>
          <div className={`mt-3 ${busy ? "text-emerald-300" : "text-[var(--color-text-tertiary)]"}`}>4. 우선순위 계산 중...</div>
          <div className="mt-5 h-2 rounded-full bg-white/[0.05]">
            <div className="h-2 rounded-full bg-emerald-400 transition-all duration-700" style={{ width: busy ? "72%" : "26%" }} />
          </div>
          <div className="mt-4 text-xs text-[var(--color-muted)]">최대 5분 정도 걸릴 수 있습니다.</div>
        </div>
      </div>
    </StepPage>
  );
}
