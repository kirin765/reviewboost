/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useFormStatus: vi.fn()
}));

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    useFormStatus: mocks.useFormStatus
  };
});

import AuthPendingSubmitButton from "./AuthPendingSubmitButton";

describe("AuthPendingSubmitButton", () => {
  it("renders the idle label when the form is not pending", () => {
    mocks.useFormStatus.mockReturnValue({ pending: false });

    render(<AuthPendingSubmitButton idleLabel="로그인" pendingLabel="로그인 중..." />);

    const button = screen.getByRole("button", { name: "로그인" });
    expect(button).toBeTruthy();
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("renders spinner and pending label while the form is submitting", () => {
    mocks.useFormStatus.mockReturnValue({ pending: true });

    render(<AuthPendingSubmitButton idleLabel="회원가입" pendingLabel="가입 중..." />);

    const button = screen.getByRole("button", { name: "가입 중..." });
    expect(button.className).toContain("btnLoading");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(document.querySelector(".spinner")).toBeTruthy();
  });
});
