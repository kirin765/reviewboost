import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  headers: vi.fn(),
  createSupabaseServerActionClient: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: mocks.createSupabaseServerActionClient
}));

import {
  requestPasswordResetAction,
  signInAction,
  signOutAction,
  signUpAction
} from "./actions";

function createFormData(entries: Array<[string, string]>) {
  const formData = new FormData();
  for (const [key, value] of entries) {
    formData.set(key, value);
  }
  return formData;
}

describe("auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "reviewboost.co.kr"
      })
    );
    mocks.createSupabaseServerActionClient.mockResolvedValue({
      auth: {
        signInWithPassword: mocks.signInWithPassword,
        signUp: mocks.signUp,
        resetPasswordForEmail: mocks.resetPasswordForEmail,
        signOut: mocks.signOut
      }
    });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("redirects successful email login to the safe next path", async () => {
    const formData = createFormData([
      ["email", "tester@example.com"],
      ["password", "secret-123"],
      ["next", "/dashboard/history"]
    ]);

    await expect(signInAction(formData)).rejects.toThrow("NEXT_REDIRECT:/dashboard/history");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "tester@example.com",
      password: "secret-123"
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard/history");
  });

  it("maps invalid email login credentials to the localized login error", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" }
    });
    const formData = createFormData([
      ["email", "tester@example.com"],
      ["password", "wrong-password"],
      ["next", "https://evil.example.com"]
    ]);

    await expect(signInAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?error=%EC%9D%B4%EB%A9%94%EC%9D%BC%20%EB%98%90%EB%8A%94%20%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8%EA%B0%80%20%EC%98%AC%EB%B0%94%EB%A5%B4%EC%A7%80%20%EC%95%8A%EC%8A%B5%EB%8B%88%EB%8B%A4."
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/login?error=%EC%9D%B4%EB%A9%94%EC%9D%BC%20%EB%98%90%EB%8A%94%20%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8%EA%B0%80%20%EC%98%AC%EB%B0%94%EB%A5%B4%EC%A7%80%20%EC%95%8A%EC%8A%B5%EB%8B%88%EB%8B%A4."
    );
  });

  it("sends password reset emails with the reset-password redirect", async () => {
    const formData = createFormData([
      ["email", "tester@example.com"],
      ["next", "/dashboard/history"]
    ]);

    await expect(requestPasswordResetAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?notice=%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8%20%EC%9E%AC%EC%84%A4%EC%A0%95%20%EB%A9%94%EC%9D%BC%EC%9D%84%20%EB%B3%B4%EB%83%88%EC%8A%B5%EB%8B%88%EB%8B%A4.%20%EB%A9%94%EC%9D%BC%EC%9D%B4%20%EB%B3%B4%EC%9D%B4%EC%A7%80%20%EC%95%8A%EC%9C%BC%EB%A9%B4%20%EC%8A%A4%ED%8C%B8%ED%95%A8%EB%8F%84%20%ED%99%95%EC%9D%B8%ED%95%9C%20%EB%92%A4%2C%20%EB%A9%94%EC%9D%BC%EC%9D%98%20%EB%A7%81%ED%81%AC%EB%A5%BC%20%EC%97%B4%EC%96%B4%20%EC%83%88%20%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8%EB%A5%BC%20%EC%84%A4%EC%A0%95%ED%95%B4%EC%A3%BC%EC%84%B8%EC%9A%94.&next=%2Fdashboard%2Fhistory"
    );

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("tester@example.com", {
      redirectTo: "https://reviewboost.co.kr/reset-password?next=%2Fdashboard%2Fhistory"
    });
  });

  it("maps password reset rate limits back to forgot-password", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      error: { message: "Email rate limit exceeded" }
    });
    const formData = createFormData([
      ["email", "tester@example.com"],
      ["next", "/dashboard"]
    ]);

    await expect(requestPasswordResetAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/forgot-password?error=%EC%9A%94%EC%B2%AD%EC%9D%B4%20%EB%A7%8E%EC%95%84%20%EC%9D%B8%EC%A6%9D%20%EB%A9%94%EC%9D%BC%20%EC%A0%84%EC%86%A1%EC%9D%B4%20%EC%9E%A0%EC%8B%9C%20%EC%A0%9C%ED%95%9C%EB%90%98%EC%97%88%EC%8A%B5%EB%8B%88%EB%8B%A4.%20%EC%9E%A0%EC%8B%9C%20%ED%9B%84%20%EB%8B%A4%EC%8B%9C%20%EC%8B%9C%EB%8F%84%ED%95%B4%EC%A3%BC%EC%84%B8%EC%9A%94.&next=%2Fdashboard"
    );
  });

  it("uses email confirmation redirect when signing up without an immediate session", async () => {
    const formData = createFormData([
      ["email", "new@example.com"],
      ["password", "secret-123"],
      ["next", "/dashboard/history"],
      ["agreeTerms", "on"],
      ["agreePrivacy", "on"],
      ["agreeMarketing", "on"]
    ]);

    await expect(signUpAction(formData)).rejects.toThrow("NEXT_REDIRECT:/login?");

    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.signUp.mock.calls[0]?.[0]).toMatchObject({
      email: "new@example.com",
      password: "secret-123",
      options: {
        emailRedirectTo: "https://reviewboost.co.kr/auth/confirm?next=%2Fdashboard%2Fhistory",
        data: {
          agree_terms: true,
          agree_privacy: true,
          agree_marketing: true
        }
      }
    });
    expect(String(mocks.signUp.mock.calls[0]?.[0].options.data.agree_marketing_at)).toContain("T");
    const redirectUrl = String(mocks.redirect.mock.calls.at(-1)?.[0] ?? "");
    const query = new URLSearchParams(redirectUrl.split("?")[1] ?? "");
    expect(redirectUrl.startsWith("/login?")).toBe(true);
    expect(query.get("signup_success")).toBe("1");
    expect(query.get("notice")).toBe("회원가입 완료. 이메일 확인 후 로그인해주세요.");
  });

  it("redirects to signup immediately when required agreements are missing", async () => {
    const formData = createFormData([
      ["email", "new@example.com"],
      ["password", "secret-123"]
    ]);

    await expect(signUpAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/signup?error=%ED%95%84%EC%88%98%20%EC%95%BD%EA%B4%80%20%EB%8F%99%EC%9D%98%20%ED%9B%84%20%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85%ED%95%A0%20%EC%88%98%20%EC%9E%88%EC%8A%B5%EB%8B%88%EB%8B%A4."
    );
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("always redirects sign-out back to login", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });
});
