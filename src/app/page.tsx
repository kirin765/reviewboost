import FeedbackModal from "@/components/FeedbackModal";

export default function HomePage(props: { searchParams?: Record<string, string | string[] | undefined> }) {
  const sp = props.searchParams ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const errCode = typeof sp.error_code === "string" ? sp.error_code : "";
  const errDesc = typeof sp.error_description === "string" ? sp.error_description : "";
  const notice = typeof sp.notice === "string" ? sp.notice : "";

  // Build friendly error message based on error code
  let errorMessage = err;
  let showResendOption = false;
  if (errCode === "otp_expired" || errDesc.includes("expired")) {
    errorMessage = "이메일 인증 링크가 만료되었습니다. 다시 회원가입을 시도해주세요.";
    showResendOption = true;
  } else if (errCode === "access_denied") {
    errorMessage = "이메일 인증에 실패했습니다. 링크가 이미 사용되었거나 유효하지 않을 수 있습니다.";
    showResendOption = true;
  } else if (errDesc) {
    // Use error_description if available
    errorMessage = errDesc.replace(/\+/g, ' ');
  }

  const isErrorState = !!errorMessage;

  return (
    <main className="pageMain">
      {isErrorState && (
        <div className="card" style={{ marginBottom: '2rem', borderColor: '#dc3545', backgroundColor: '#fff5f5' }}>
          <h2 style={{ color: '#dc3545', marginTop: 0 }}>⚠️ 인증 실패</h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{errorMessage}</p>
          {showResendOption && (
            <div className="actionRow">
              <a className="btn btnPrimary" href="/signup">
                다시 가입하기
              </a>
              <a className="btn" href="/help">
                도움말 보기
              </a>
            </div>
          )}
        </div>
      )}
      {!isErrorState && notice ? <FeedbackModal title="안내" message={notice} /> : null}
      <div className="card heroCard">
        <a href="/help" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <h1 className="heroTitle">리뷰로 매출 올릴 포인트, 자동으로 뽑아드립니다</h1>
          <p className="heroLead">
            CSV로 리뷰를 올리면, 자주 나오는 불만(키워드/카테고리)과 상세페이지/CS/FAQ 문구를 바로 쓸 수 있게 정리해줍니다.
          </p>
        </a>
        <div className="actionRow actionRowLg">
          <a className="btn btnPrimary" href="/dashboard">
            CSV 올리고 분석하기
          </a>
          <a className="btn" href="/help">
            사용법 보기
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>진행 순서</h2>
          <div className="list">
            <div className="row">
              <div className="left">1) CSV 업로드</div>
              <div className="right">리뷰 내용(필수) + 별점(권장)</div>
            </div>
            <div className="row">
              <div className="left">2) 자동 분석</div>
              <div className="right">불만 TOP / 카테고리 / 우선순위</div>
            </div>
            <div className="row">
              <div className="left">3) 개선 제안</div>
              <div className="right">상세페이지/CS/FAQ 문구</div>
            </div>
            <div className="row">
              <div className="left">4) PDF 리포트</div>
              <div className="right">다운로드</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>처음이신가요?</h2>
          <p className="muted">
            가입이나 설정 없이도 분석은 바로 가능합니다. (저장 기능은 로그인 기능을 켜면 사용할 수 있어요.)
          </p>
          <p className="muted">
            CSV 헤더는 어떤 이름이어도 괜찮습니다. 업로드 후 화면에서 &quot;리뷰 내용/별점/작성일&quot; 열만 선택해주면 됩니다.
          </p>
          <div className="actionRow">
            <a className="btn" href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
