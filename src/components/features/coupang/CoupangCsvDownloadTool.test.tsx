/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import CoupangCsvDownloadTool from "./CoupangCsvDownloadTool";

const downloadCoupangCsv = vi.fn();

vi.mock("@/lib/api/coupang", () => ({
  downloadCoupangCsv: (payload: unknown) => downloadCoupangCsv(payload)
}));

describe("CoupangCsvDownloadTool", () => {
  it("downloads CSV from a product URL", async () => {
    downloadCoupangCsv.mockResolvedValueOnce({
      blob: new Blob(["id"], { type: "text/csv" }),
      filename: "reviews.csv"
    });

    render(
      <I18nProvider>
        <CoupangCsvDownloadTool />
      </I18nProvider>
    );

    fireEvent.change(screen.getByLabelText("상품 URL"), {
      target: { value: "https://www.coupang.com/vp/products/123" }
    });
    fireEvent.click(screen.getByRole("button", { name: "CSV 다운로드" }));

    await waitFor(() => {
      expect(downloadCoupangCsv).toHaveBeenCalledWith({ productUrl: "https://www.coupang.com/vp/products/123" });
    });
  });
});
