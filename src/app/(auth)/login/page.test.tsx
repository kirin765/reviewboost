/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import LoginPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({
    get: () => null
  })
}));

vi.mock("@/app/(auth)/actions", () => ({
  signInAction: "/login"
}));

describe("LoginPage", () => {
  it("renders the login form inputs and submit action", () => {
    render(
      <I18nProvider>
        <LoginPage />
      </I18nProvider>
    );

    expect(screen.getByLabelText("이메일")).toBeTruthy();
    expect(screen.getByLabelText("비밀번호")).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그인" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "회원가입" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "분석하러 가기" })).toBeTruthy();
  });
});
