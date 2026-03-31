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

    expect(screen.getAllByText("리뷰의 감정을 분석하고 있어요...").length).toBeGreaterThan(0);
    expect(screen.getByText("여기도 채워주세요")).toBeTruthy();
  });

  it("renders an explicit analyze action in the mapping step", () => {
    render(
      <I18nProvider>
        <DashboardAnalysisPanel
          file={new File([""], "sample.csv")}
          busy={false}
          preview={{
            filename: "sample.csv",
            columns: ["content"],
            headerMode: "header",
            inferred: {
              headerMode: "header",
              textCol: "content",
              textColSource: "explicit",
              ratingCol: "",
              dateCol: ""
            },
            sampleRows: [{ content: "좋아요" }],
            totalRows: 1,
            warnings: []
          }}
          result={null}
          caps={null}
          step={2}
          analysisStage="done"
          textCol="content"
          ratingCol=""
          dateCol=""
          showAllPreviewCols={false}
          cellModal={null}
          onFileSelect={() => {}}
          onReset={() => {}}
          onSample={() => {}}
          onAnalyze={() => {}}
          onDownloadPdf={() => {}}
          onBackToUpload={() => {}}
          onTextColChange={() => {}}
          onRatingColChange={() => {}}
          onDateColChange={() => {}}
          onTogglePreviewCols={() => {}}
          onCellClick={() => {}}
          onCellModalClose={() => {}}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("button", { name: "분석 시작" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "다시 업로드" }).length).toBeGreaterThan(0);
  });
});
