/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CsvPreview } from "@/lib/csv";

import DashboardAnalysisPanel from "./DashboardAnalysisPanel";

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
    <DashboardAnalysisPanel
      file={new File(["a"], "review.csv")}
      busy={false}
      preview={preview}
      result={null}
      caps={null}
      step={2}
      analysisStage="collect"
      textCol={preview.inferred.textCol}
      ratingCol=""
      dateCol=""
      showAllPreviewCols={false}
      cellModal={null}
      onFileSelect={vi.fn()}
      onReset={vi.fn()}
      onSample={vi.fn()}
      onAnalyze={onAnalyze}
      onDownloadPdf={vi.fn()}
      onTextColChange={vi.fn()}
      onRatingColChange={vi.fn()}
      onDateColChange={vi.fn()}
      onTogglePreviewCols={vi.fn()}
      onCellClick={vi.fn()}
      onCellModalClose={vi.fn()}
    />
  );
  return { onAnalyze, button: screen.getByRole("button", { name: "분석 시작" }) };
}

describe("DashboardAnalysisPanel — 리뷰 본문 열 미확인 차단", () => {
  afterEach(cleanup);

  // 2026-07-28 첫 유료 고객이 상품번호 열을 본문으로 분석해 결과가 통째로 무의미해졌다.
  it("blocks 분석 시작 and says results will be empty when the column holds numbers", () => {
    const { onAnalyze, button } = renderPanel(previewWith("fallback", "상품번호"));

    expect((button as HTMLButtonElement).disabled).toBe(true);
    // 열 매핑 패널과 하단 액션 레일 두 곳 모두에 뜬다
    expect(screen.getAllByText("이대로 분석하면 결과가 나오지 않습니다.").length).toBe(2);

    fireEvent.click(button);
    expect(onAnalyze).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });

  it("still asks for confirmation when the guess failed but values look like sentences", () => {
    const { button } = renderPanel(previewWith("fallback"));

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("리뷰 본문 열을 자동으로 찾지 못했습니다.")).toBeTruthy();
  });

  it("does not block when the text column was detected explicitly", () => {
    const { onAnalyze, button } = renderPanel(previewWith("explicit"));

    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText("리뷰 본문 열을 자동으로 찾지 못했습니다.")).toBeNull();

    fireEvent.click(button);
    expect(onAnalyze).toHaveBeenCalledTimes(1);
  });
});
