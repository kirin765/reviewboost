"use client";

import React, { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { isApiErrorBody } from "@/lib/api_error";

const CATEGORIES = [
  { value: "billing", label: "결제·환불" },
  { value: "usage", label: "사용 방법" },
  { value: "bug", label: "오류 신고" },
  { value: "other", label: "기타" }
] as const;

export default function SupportForm() {
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("usage");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/navigation-session", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => (res.ok ? ((await res.json()) as { userEmail?: string | null }) : null))
      .then((session) => {
        if (!active || !session?.userEmail) return;
        setEmail((prev) => prev || session.userEmail || "");
      })
      .catch(() => {
        // 비로그인/조회 실패 시 이메일을 직접 입력하면 된다.
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, category, message })
      });
      if (res.ok) {
        setStatus("done");
        return;
      }
      const body: unknown = await res.json().catch(() => null);
      setErrorText(isApiErrorBody(body) ? body.error.message : "접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setStatus("idle");
    } catch {
      setErrorText("네트워크 오류로 접수하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <div className="card" role="status">
        <h2>문의가 접수되었습니다 ✅</h2>
        <p className="muted">
          답변은 <strong>{email}</strong> 으로 보내드립니다. 보통 영업일 기준 1일 이내에 회신합니다.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} aria-label="1:1 문의 양식">
      <div style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>답변받을 이메일</span>
          <input
            className="input"
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>문의 유형</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>문의 내용</span>
          <textarea
            className="input"
            required
            minLength={5}
            maxLength={2000}
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="겪고 계신 문제나 궁금한 점을 자세히 적어주세요. 오류라면 업로드한 파일 형태와 화면에 표시된 메시지를 함께 알려주시면 빠르게 확인할 수 있습니다."
          />
        </label>

        {errorText ? (
          <p role="alert" style={{ color: "#e0553b", margin: 0 }}>
            {errorText}
          </p>
        ) : null}

        <div>
          <button type="submit" className={buttonStyles({ variant: "primary" })} disabled={status === "sending"}>
            {status === "sending" ? "접수 중…" : "문의 보내기"}
          </button>
        </div>
      </div>
    </form>
  );
}
