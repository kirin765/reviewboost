import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { userEvent, within } from "@storybook/test";
import CsvPreview from "./CsvPreview";

const meta: Meta<typeof CsvPreview> = {
  title: "Dashboard/CsvPreview",
  component: CsvPreview
};

export default meta;

type Story = StoryObj<typeof CsvPreview>;

const previewData = {
  filename: "sample.csv",
  headerMode: "header" as const,
  columns: ["content", "rating", "date"],
  inferred: {
    headerMode: "header" as const,
    textCol: "content",
    textColSource: "explicit" as const,
    ratingCol: "rating",
    dateCol: "date"
  },
  sampleRows: [
    { content: "재방문 의향이 높아요", rating: "5", date: "2026-01-01" },
    { content: "배송이 느렸어요", rating: "2", date: "2026-01-02" }
  ],
  totalRows: 2,
  warnings: []
};

export const Default: Story = {
  args: {
    preview: previewData,
    busy: false,
    textCol: "content",
    ratingCol: "rating",
    dateCol: "date",
    showAllPreviewCols: false,
    cellModal: null,
    onTextColChange: () => {},
    onRatingColChange: () => {},
    onDateColChange: () => {},
    onTogglePreviewCols: () => {},
    onCellClick: () => {},
    onCellModalClose: () => {}
  }
};

function CellModalPreviewRenderer() {
  const [cellModal, setCellModal] = useState<{ col: string; value: string } | null>(null);

  return (
    <CsvPreview
      preview={previewData}
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
}

export const CellModalPreview: Story = {
  render: () => <CellModalPreviewRenderer />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const contentCell = await canvas.findByRole("button", { name: "재방문 의향이 높아요" });
    await userEvent.click(contentCell);
  }
};
