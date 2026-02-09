import { signUpAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default function SignupPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const supabaseConfigured = typeof process.env.SUPABASE_URL === "string" && typeof process.env.SUPABASE_ANON_KEY === "string";

  return (
    <main style={{ marginTop: 18 }}>
      <div className="grid">
        <div className="card">
          <h2>회원가입</h2>
          <p className="muted">저장된 리포트를 쓰려면 계정을 만들면 됩니다. (분석은 로그인 없이도 가능)</p>

          {supabaseConfigured ? (
            <form action={signUpAction} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input className="input" name="email" type="email" placeholder="email@example.com" required />
              <input
                className="input"
                name="password"
                type="password"
                placeholder="비밀번호 (8자 이상 권장)"
                minLength={6}
                required
              />
              <button className="btn btnPrimary" type="submit">
                회원가입
              </button>
            </form>
          ) : (
            <p className="hint muted" style={{ marginTop: 12 }}>
              현재는 회원가입 기능이 꺼져 있습니다. CSV 분석은 바로 사용할 수 있어요.
            </p>
          )}

          {err ? (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {err}
            </p>
          ) : (
            <p className="hint muted">회원가입은 “저장된 리포트” 기능을 위한 옵션입니다.</p>
          )}
        </div>

        <div className="card">
          <h2>이미 계정이 있나요?</h2>
          <p className="muted">로그인 페이지로 이동하세요.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn" href="/login">
              로그인으로 이동
            </a>
            <a className="btn" href="/dashboard">
              분석하러 가기
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
