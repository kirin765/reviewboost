/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import CsvPreview from "./CsvPreview";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";

const preview: CsvPreviewType = {
  filename: "sample.csv",
  headerMode: "header",
  columns: ["content", "rating", "date"],
  inferred: {
    headerMode: "header",
    textCol: "content",
    textColSource: "explicit",
    ratingCol: "rating",
    dateCol: "date"
  },
  sampleRows: [
    { content: "좋아요", rating: "5", date: "2026-01-01" },
    { content: "별로", rating: "1", date: "2026-01-02" }
  ],
  totalRows: 2,
  warnings: []
};

describe("CsvPreview", () => {
  it("opens and closes cell modal", () => {
    const Wrapper = () => {
      const [cellModal, setCellModal] = useState<{ col: string; value: string } | null>(null);
      return (
        <CsvPreview
          preview={preview}
          busy={false}
          textCol="content"
          ratingCol="rating"
          dateCol="date"
          showAllPreviewCols={false}
          cellModal={cellModal}
          onTextColChange={() => {}}
          onRatingColChange={() => {}}
          onDateColChange={() => {}}
          onTogglePreviewCols={() => {}}
          onCellClick={(col, value) => setCellModal({ col, value })}
          onCellModalClose={() => setCellModal(null)}
        />
      );
    };

    render(<Wrapper />);

    expect(screen.queryByRole("button", { name: "셀 모달 닫기" })).toBeNull();

    const contentCell = screen.getAllByRole("button", { name: "좋아요" })[0];
    fireEvent.click(contentCell);

    const closeButton = screen.getByRole("button", { name: "셀 모달 닫기" });
    expect(closeButton).toBeTruthy();
    expect(screen.getByRole("button", { name: "셀 내용 전체 복사" })).toBeTruthy();
    // the cell value is echoed inside the modal (in addition to the table cell)
    expect(screen.getAllByText("좋아요").length).toBeGreaterThan(1);

    fireEvent.click(closeButton);
    expect(screen.queryByRole("button", { name: "셀 모달 닫기" })).toBeNull();
  });
});
