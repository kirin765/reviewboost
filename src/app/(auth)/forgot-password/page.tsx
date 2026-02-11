import { requestPasswordResetAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  const supabaseConfigured = typeof process.env.SUPABASE_URL === "string" && typeof process.env.SUPABASE_ANON_KEY === "string";

  return (
    <main className="pageMain">
      <div className="grid">
        <div className="card">
          <h2>비밀번호 재설정</h2>
          <p className="muted">가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>

          {supabaseConfigured ? (
            <form action={requestPasswordResetAction} style={{ display: "grid", gap: 10, marginTop: 12 }}>
              <input type="hidden" name="next" value={next} />
              <input className="input" name="email" type="email" placeholder="email@example.com" required />
              <button className="btn btnPrimary" type="submit">
                재설정 메일 보내기
              </button>
            </form>
          ) : (
            <p className="hint muted" style={{ marginTop: 12 }}>
              현재는 비밀번호 재설정 기능이 꺼져 있습니다.
            </p>
          )}

          {err ? (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {err}
            </p>
          ) : (
            <p className="hint muted">요청 후 메일이 오지 않으면 스팸함도 확인해주세요.</p>
          )}
        </div>

        <div className="card">
          <h2>로그인으로 이동</h2>
          <p className="muted">비밀번호가 기억나면 바로 로그인할 수 있습니다.</p>
          <div className="actionRow">
            <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
              로그인으로 이동
            </a>
            <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
              회원가입
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
