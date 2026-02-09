"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

function readString(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function signUpAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  try {
    const supabase = createSupabaseServerActionClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

    // If email confirmation is enabled, there may be no session yet.
    if (data.session) redirect("/dashboard");
    redirect(`/login?error=${encodeURIComponent("회원가입 완료. 이메일 확인이 필요할 수 있습니다.")}`);
  } catch (e: any) {
    redirect(`/signup?error=${encodeURIComponent(e?.message ?? String(e))}`);
  }
}

export async function signInAction(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");

  try {
    const supabase = createSupabaseServerActionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    redirect("/dashboard");
  } catch (e: any) {
    redirect(`/login?error=${encodeURIComponent(e?.message ?? String(e))}`);
  }
}

export async function signOutAction() {
  try {
    const supabase = createSupabaseServerActionClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}
