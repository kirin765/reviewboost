import { signUpAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";

export const dynamic = "force-dynamic";

export default function SignupPage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  const supabaseConfigured = typeof process.env.SUPABASE_URL === "string" && typeof process.env.SUPABASE_ANON_KEY === "string";

  return (
    <main className="pageMain">
      {err ? <FeedbackModal title="회원가입 실패" message={err} tone="error" /> : null}
      <div className="card" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
          {/* Left: Value proposition */}
          <div>
            <h2 style={{ marginTop: 0 }}>무료로 시작하세요</h2>
            <p className="muted" style={{ fontSize: 15, lineHeight: 1.7 }}>
              ReviewBoost 회원이 되어 분석 리포트를 저장하고 관리하세요.
            </p>
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>회원 가입 시:</h4>
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

          {/* Right: Signup form */}
          <div>
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>회원가입</h3>
            {supabaseConfigured ? (
              <form action={signUpAction} style={{ display: "grid", gap: 12 }}>
                <input type="hidden" name="next" value={next} />
                <div>
                  <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>이메일</label>
                  <input className="input" name="email" type="email" placeholder="email@example.com" required />
                </div>
                <div>
                  <label className="muted" style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>비밀번호</label>
                  <input
                    className="input"
                    name="password"
                    type="password"
                    placeholder="비밀번호 (8자 이상 권장)"
                    minLength={6}
                    required
                  />
                </div>
                <label className="consentRow">
                  <input type="checkbox" name="agreeTerms" value="yes" required />
                  <span>
                    [필수] 이용약관 동의{" "}
                    <a className="link" href="/terms" target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      자세히 보기
                    </a>
                  </span>
                </label>
                <label className="consentRow">
                  <input type="checkbox" name="agreePrivacy" value="yes" required />
                  <span>
                    [필수] 개인정보 수집·이용 동의{" "}
                    <a className="link" href="/privacy" target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      자세히 보기
                    </a>
                  </span>
                </label>
                <div className="consentSummary">
                  목적: 회원 식별/로그인/계정관리 | 항목: 이메일 | 보유기간: 회원 탈퇴 시까지(법령 보관 제외) | 거부 시: 회원가입 불가
                </div>
                <label className="consentRow optional">
                  <input type="checkbox" name="agreeMarketing" value="yes" />
                  <span>[선택] 광고성 정보(이벤트/혜택) 이메일 수신 동의</span>
                </label>
                <button className="btn btnPrimary" type="submit" style={{ marginTop: 8 }}>
                  회원가입
                </button>
              </form>
            ) : (
              <p className="hint muted">
                현재는 회원가입 기능이 꺼져 있습니다. CSV 분석은 바로 사용할 수 있어요.
              </p>
            )}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>이미 계정이 있으신가요?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
                  로그인
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
