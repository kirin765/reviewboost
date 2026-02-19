import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FeedbackModal from "./FeedbackModal";

describe("FeedbackModal", () => {
  it("re-opens when props change after user closed it", () => {
    const { rerender } = render(
      <FeedbackModal title="로그인 실패" message="첫 번째 오류" tone="error" />
    );

    expect(screen.getByRole("dialog", { name: "로그인 실패" })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "닫기" })[0]);
    expect(screen.queryByRole("dialog", { name: "로그인 실패" })).toBeNull();

    rerender(<FeedbackModal title="로그인 실패" message="두 번째 오류" tone="error" />);
    expect(screen.getByRole("dialog", { name: "로그인 실패" })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "닫기" })[0]);
    expect(screen.queryByRole("dialog", { name: "로그인 실패" })).toBeNull();

    rerender(<FeedbackModal title="안내" message="성공 안내" tone="info" />);
    expect(screen.getByRole("dialog", { name: "안내" })).toBeTruthy();
  });
});
