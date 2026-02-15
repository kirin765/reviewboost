import { signInAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";

export const dynamic = "force-dynamic";

export default function LoginPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const notice = typeof sp.notice === "string" ? sp.notice : "";
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  const supabaseConfigured = typeof process.env.SUPABASE_URL === "string" && typeof process.env.SUPABASE_ANON_KEY === "string";

  return (
    <main className="pageMain">
      {err ? <FeedbackModal title="로그인 실패" message={err} tone="error" /> : null}
      {!err && notice ? <FeedbackModal title="안내" message={notice} /> : null}
      <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {/* Left: Value proposition */}
          <div>
            <h2 style={{ marginTop: 0 }}>ReviewBoost에 오신 것을 환영합니다</h2>
            <p className="muted" style={{ fontSize: 15, lineHeight: 1.7 }}>
              리뷰 기반 매출 개선 서비스를 이용하려면 로그인하세요.
            </p>
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>로그인하면:</h4>
              <ul style={{ paddingLeft: 20, color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.8 }}>
                <li>분석 리포트 저장 및 재확인</li>
                <li>지난 분석 히스토리 조회</li>
                <li>구독 플랜 관리</li>
              </ul>
            </div>
            <div style={{ marginTop: 24, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
                분석 자체는 로그인 없이도 무료로 사용 가능합니다.
              </p>
            </div>
          </div>

          {/* Right: Login form */}
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>로그인</h3>
            {supabaseConfigured ? (
              <form action={signInAction} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="next" value={next} />
                <div>
                  <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>이메일</label>
                  <input className="input" name="email" type="email" placeholder="email@example.com" required />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>비밀번호</label>
                  <input className="input" name="password" type="password" placeholder="비밀번호" required />
                </div>
                <button className="btn btnPrimary" type="submit" style={{ marginTop: 8 }}>
                  로그인
                </button>
                <div style={{ marginTop: 8 }}>
                  <a className="link" href={`/forgot-password?next=${encodeURIComponent(next)}`} style={{ fontSize: 13 }}>
                    비밀번호를 잊으셨나요?
                  </a>
                </div>
              </form>
            ) : (
              <p className="hint muted">
                현재는 로그인 기능이 꺼져 있습니다. CSV 분석은 바로 사용할 수 있어요.
              </p>
            )}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>계정이 없으신가요?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
                  회원가입
                </a>
                <a className="btn btnOutline" href="/dashboard">
                  분석하러 가기
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
