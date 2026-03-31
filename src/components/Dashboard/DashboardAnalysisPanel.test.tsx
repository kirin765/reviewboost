/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import DashboardAnalysisPanel from "./DashboardAnalysisPanel";

vi.mock("./FileUploader", () => ({
  default: () => <div>Uploader</div>
}));

vi.mock("./CsvPreview", () => ({
  default: () => <div>Preview</div>
}));

describe("DashboardAnalysisPanel", () => {
  it("renders the terminal loading UI and the empty preview state", () => {
    render(
      <I18nProvider>
        <DashboardAnalysisPanel
          file={new File([""], "sample.csv")}
          busy={true}
          preview={null}
          result={null}
          caps={null}
          step={3}
          analysisStage="sentiment"
          textCol=""
          ratingCol=""
          dateCol=""
          showAllPreviewCols={false}
          cellModal={null}
          onFileSelect={() => {}}
          onReset={() => {}}
          onSample={() => {}}
          onAnalyze={() => {}}
          onDownloadPdf={() => {}}
          onTextColChange={() => {}}
          onRatingColChange={() => {}}
          onDateColChange={() => {}}
          onTogglePreviewCols={() => {}}
          onCellClick={() => {}}
          onCellModalClose={() => {}}
        />
      </I18nProvider>
    );

    expect(screen.getAllByText("감정 분석 진행 중...").length).toBeGreaterThan(0);
    expect(screen.getByText("여기도 채워주세요")).toBeTruthy();
  });
});
