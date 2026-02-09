import { signInAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default function LoginPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const supabaseConfigured = typeof process.env.SUPABASE_URL === "string" && typeof process.env.SUPABASE_ANON_KEY === "string";

  return (
    <main style={{ marginTop: 18 }}>
      <div className="grid">
        <div className="card">
          <h2>로그인</h2>
          <p className="muted">저장된 리포트를 쓰려면 로그인하면 됩니다. (분석은 로그인 없이도 가능)</p>

          {supabaseConfigured ? (
            <form action={signInAction} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input className="input" name="email" type="email" placeholder="email@example.com" required />
              <input className="input" name="password" type="password" placeholder="비밀번호" required />
              <button className="btn btnPrimary" type="submit">
                로그인
              </button>
            </form>
          ) : (
            <p className="hint muted" style={{ marginTop: 12 }}>
              현재는 로그인 기능이 꺼져 있습니다. CSV 분석은 바로 사용할 수 있어요.
            </p>
          )}

          {err ? (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {err}
            </p>
          ) : (
            <p className="hint muted">로그인은 “저장된 리포트” 기능을 위한 옵션입니다.</p>
          )}
        </div>

        <div className="card">
          <h2>회원가입</h2>
          <p className="muted">계정이 없으면 회원가입 후 로그인하세요.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn" href="/signup">
              회원가입으로 이동
            </a>
            <a className="btn" href="/dashboard">
              분석하러 가기
            </a>
          </div>
          <p className="hint muted">로그인 없이도 분석은 가능합니다.</p>
        </div>
      </div>
    </main>
  );
}
