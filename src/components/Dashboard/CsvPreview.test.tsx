/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import CsvPreview from "./CsvPreview";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";

afterEach(cleanup);

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

  it("renders 스마트스토어 폼 감지 배지와 안내 when smartstore form detected", () => {
    const smartstorePreview: CsvPreviewType = {
      ...preview,
      source: "smartstore",
      smartstore: {
        text: "리뷰상세내용",
        rating: "구매자평점",
        date: "리뷰등록일",
        author: "등록자",
        photo: "포토/영상",
        helpful: "리뷰도움수",
        reply: "답글여부",
        best: "베스트리뷰",
        productName: "상품명",
        productNo: "상품번호"
      }
    };

    render(
      <CsvPreview
        preview={smartstorePreview}
        busy={false}
        textCol="리뷰상세내용"
        ratingCol="구매자평점"
        dateCol="리뷰등록일"
        showAllPreviewCols={false}
        cellModal={null}
        onTextColChange={() => {}}
        onRatingColChange={() => {}}
        onDateColChange={() => {}}
        onTogglePreviewCols={() => {}}
        onCellClick={() => {}}
        onCellModalClose={() => {}}
      />
    );

    expect(screen.getByText("스마트스토어 공식 리뷰 엑셀 폼 감지")).toBeTruthy();
    expect(screen.getByText(/리뷰상세내용·구매자평점·리뷰등록일이 자동 매핑되었고/)).toBeTruthy();
  });

  it("does not show the smartstore badge for generic files", () => {
    render(
      <CsvPreview
        preview={preview}
        busy={false}
        textCol="content"
        ratingCol="rating"
        dateCol="date"
        showAllPreviewCols={false}
        cellModal={null}
        onTextColChange={() => {}}
        onRatingColChange={() => {}}
        onDateColChange={() => {}}
        onTogglePreviewCols={() => {}}
        onCellClick={() => {}}
        onCellModalClose={() => {}}
      />
    );

    expect(screen.queryByText("스마트스토어 공식 리뷰 엑셀 폼 감지")).toBeNull();
  });
});
