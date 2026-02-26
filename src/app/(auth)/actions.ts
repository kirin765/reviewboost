"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function readString(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function readCheckbox(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "yes" || v === "on" || v === "true";
}

function safeNextPath(raw: string, fallback: string) {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

function withQuery(path: string, key: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

function mapAuthError(raw: string, mode: "login" | "signup" | "reset") {
  const message = String(raw || "").trim();
  if (!message) {
    if (mode === "signup") return "회원가입 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (mode === "login") return "로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    return "비밀번호 재설정 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  const lower = message.toLowerCase();
  if (lower.includes("email rate limit exceeded") || lower.includes("rate limit")) {
    return "요청이 많아 인증 메일 전송이 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.";
  }
  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (lower.includes("email not confirmed")) {
    return "이메일 인증이 완료되지 않았습니다. 메일함에서 인증 후 다시 로그인해주세요.";
  }
  if (lower.includes("user already registered")) {
    return "이미 가입된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용해주세요.";
  }
  if (lower.includes("password should be at least")) {
    return "비밀번호는 최소 6자 이상이어야 합니다.";
  }
  if (lower.includes("user not found")) {
    return "가입 이력이 없는 이메일이거나 확인할 수 없습니다.";
  }

  return message;
}

async function detectOriginFromHeaders() {
  const h = await (headers() as any);
  const forwardedProto = h.get("x-forwarded-proto");
  const forwardedHost = h.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("host");
  if (host) return `https://${host}`;
  // Fallback to environment variable for proper production URLs
  return process.env.APP_BASE_URL || null;
}

export async function signUpAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const next = safeNextPath(readString(formData, "next"), "/dashboard");
  const agreeTerms = readCheckbox(formData, "agreeTerms");
  const agreePrivacy = readCheckbox(formData, "agreePrivacy");
  const agreeMarketing = readCheckbox(formData, "agreeMarketing");

  if (!agreeTerms || !agreePrivacy) {
    redirect(`/signup?error=${encodeURIComponent("필수 약관 동의 후 회원가입할 수 있습니다.")}`);
  }

  let hasSession = false;
  let signUpError: string | null = null;
  try {
    const supabase = await createSupabaseServerActionClient();
    const origin = await detectOriginFromHeaders();
    const emailRedirectTo = origin
      ? `${origin}/auth/confirm?next=${encodeURIComponent(next)}`
      : undefined;
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          agree_terms: agreeTerms,
          agree_privacy: agreePrivacy,
          agree_marketing: agreeMarketing,
          agree_marketing_at: agreeMarketing ? new Date().toISOString() : null
        }
      }
    });
    hasSession = Boolean(signUpData.session);
    signUpError = error?.message ?? null;
  } catch (e: any) {
    signUpError = e?.message ?? String(e);
  }

  if (signUpError) redirect(`/signup?error=${encodeURIComponent(mapAuthError(signUpError, "signup"))}`);
  if (hasSession) redirect(withQuery(next, "signup_success", "1"));
  const loginPath = `/login?notice=${encodeURIComponent("회원가입 완료. 이메일 확인 후 로그인해주세요.")}`;
  redirect(withQuery(loginPath, "signup_success", "1"));
}

export async function signInAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const next = safeNextPath(readString(formData, "next"), "/dashboard");

  let signInError: string | null = null;
  try {
    const supabase = await createSupabaseServerActionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    signInError = error?.message ?? null;
  } catch (e: any) {
    signInError = e?.message ?? String(e);
  }

  if (signInError) redirect(`/login?error=${encodeURIComponent(mapAuthError(signInError, "login"))}`);
  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = readString(formData, "email");
  const next = safeNextPath(readString(formData, "next"), "/dashboard");

  let resetError: string | null = null;
  try {
    const supabase = await createSupabaseServerActionClient();
    const origin = await detectOriginFromHeaders();
    const redirectTo = origin
      ? `${origin}/reset-password?next=${encodeURIComponent(next)}`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    resetError = error?.message ?? null;
  } catch (e: any) {
    resetError = e?.message ?? String(e);
  }

  if (resetError) {
    const q = `error=${encodeURIComponent(mapAuthError(resetError, "reset"))}&next=${encodeURIComponent(next)}`;
    redirect(`/forgot-password?${q}`);
  }
  const notice = "비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 열어 새 비밀번호를 설정해주세요.";
  redirect(`/login?notice=${encodeURIComponent(notice)}&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerActionClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}
