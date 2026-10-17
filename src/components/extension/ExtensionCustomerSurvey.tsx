"use client";

import { useEffect, useState } from "react";
import { surveySources, surveyTasks } from "@/lib/extension-survey";

const storageKey = "reviewboost-extension-survey-v1";

export default function ExtensionCustomerSurvey() {
  const [visible, setVisible] = useState(false);
  const [task, setTask] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setVisible(localStorage.getItem(storageKey) !== "done"); }
    catch { setVisible(true); }
  }, []);
  function dismiss() {
    try { localStorage.setItem(storageKey, "done"); } catch { /* optional */ }
    setVisible(false);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/extension/survey", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ task, source })
      });
      if (!res.ok) throw new Error("save failed");
      dismiss();
      setSaved(true);
    } catch { setError("저장하지 못했습니다. 다시 시도하거나 건너뛰어도 됩니다."); }
    finally { setBusy(false); }
  }
  if (saved) return <p role="status">답변 감사합니다. 더 편리한 리뷰 수집에 참고하겠습니다.</p>;
  if (!visible) return null;
  return (
    <section className="card" aria-labelledby="extension-survey-title">
      <h2 id="extension-survey-title" style={{ fontSize: 18 }}>어떤 작업에 사용하시나요? <small>(선택)</small></h2>
      <p>답변 없이 바로 수집을 시작해도 됩니다. 답변은 계정과 함께 서비스 개선·유입 경로 파악에만 사용합니다.</p>
      <form onSubmit={submit}>
        <div style={{ display: "grid", gap: 16, marginBlock: 16 }}>
          <label htmlFor="survey-task">주로 하려는 작업
            <select id="survey-task" className="input" value={task} onChange={e => setTask(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
              <option value="">선택하지 않음</option>
              {Object.entries(surveyTasks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor="survey-source">ReviewBoost를 처음 알게 된 곳
            <select id="survey-source" className="input" value={source} onChange={e => setSource(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6 }}>
              <option value="">선택하지 않음</option>
              {Object.entries(surveySources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={busy || (!task && !source)}>{busy ? "저장 중…" : "답변 보내기"}</button>
          <button className="btn" type="button" onClick={dismiss} disabled={busy}>건너뛰기</button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
