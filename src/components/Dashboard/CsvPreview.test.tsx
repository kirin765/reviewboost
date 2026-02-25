/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import CsvPreview from "./CsvPreview";

const preview = {
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
          preview={preview as any}
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

    const contentCell = screen.getAllByRole("button", { name: "좋아요" })[0];
    fireEvent.click(contentCell);

    const dialog = screen.getByRole("dialog", { name: "셀 전체보기" });
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain("좋아요");

    const closeButton = within(dialog)
      .getAllByRole("button")
      .find((btn) => btn.textContent?.trim() === "닫기");
    expect(closeButton).toBeDefined();
    if (!closeButton) return;
    fireEvent.click(closeButton);
    expect(screen.queryByRole("dialog", { name: "셀 전체보기" })).toBeNull();
  });
});
