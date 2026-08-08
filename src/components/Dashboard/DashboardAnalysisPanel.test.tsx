/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import type { CsvPreview } from "@/lib/csv";
import DashboardAnalysisPanel from "./DashboardAnalysisPanel";

vi.mock("./FileUploader", () => ({
  default: () => <div>Uploader</div>
}));

vi.mock("./CsvPreview", () => ({
  default: () => <div>Preview</div>
}));

// setupFiles가 없어 testing-library 자동 정리가 안 걸린다. 없으면 앞 테스트의 DOM이 남아
// 다음 테스트에서 같은 버튼이 두 개로 잡힌다.
afterEach(cleanup);

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

    expect(screen.getAllByRole("button", { name: "다시 업로드" }).length).toBeGreaterThan(0);
    // "좋아요" 같은 짧은 한국어 리뷰가 값 판정에 걸려 막히면 안 된다
    expect((screen.getByRole("button", { name: "분석 시작" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

// 2026-07-28 첫 유료 고객이 상품번호 열을 본문으로 분석해 결과가 통째로 무의미해졌다.
describe("DashboardAnalysisPanel — 리뷰 본문 열 미확인 차단", () => {
  function previewWith(textColSource: "explicit" | "fallback", textCol = "리뷰상세내용"): CsvPreview {
    return {
      filename: "review_20260808.csv",
      headerMode: "header",
      columns: ["상품번호", "리뷰상세내용"],
      inferred: { headerMode: "header", textCol, textColSource, ratingCol: null, dateCol: null },
      sampleRows: [{ 상품번호: "12883224965", 리뷰상세내용: "공간이 넓어서 냥이가 자꾸 빠져나옵니다" }],
      totalRows: 1,
      warnings: []
    };
  }

  function renderPanel(preview: CsvPreview) {
    const onAnalyze = vi.fn();
    render(
      <I18nProvider>
        <DashboardAnalysisPanel
          file={new File(["a"], "review.csv")}
          busy={false}
          preview={preview}
          result={null}
          caps={null}
          step={2}
          analysisStage="done"
          textCol={preview.inferred.textCol}
          ratingCol=""
          dateCol=""
          showAllPreviewCols={false}
          cellModal={null}
          onFileSelect={() => {}}
          onReset={() => {}}
          onSample={() => {}}
          onAnalyze={onAnalyze}
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
    return { onAnalyze, button: screen.getByRole("button", { name: "분석 시작" }) as HTMLButtonElement };
  }

  it("blocks 분석 시작 and says results will be empty when the column holds no letters", () => {
    const { onAnalyze, button } = renderPanel(previewWith("fallback", "상품번호"));

    expect(button.disabled).toBe(true);
    expect(screen.getByText("이대로 분석하면 결과가 나오지 않습니다.")).toBeTruthy();

    fireEvent.click(button);
    expect(onAnalyze).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("still asks for confirmation when the guess failed but values look like sentences", () => {
    const { button } = renderPanel(previewWith("fallback"));

    expect(button.disabled).toBe(true);
    expect(screen.getByText("리뷰 본문 열을 자동으로 찾지 못했습니다.")).toBeTruthy();
  });
});
