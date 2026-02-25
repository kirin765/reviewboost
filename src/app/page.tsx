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
    errorMessage = errDesc.replace(/\+/g, " ");
  }

  const isErrorState = !!errorMessage;
  const steps = ["CSV 업로드", "열 매핑", "자동 분석", "개선 결과 확인"];

  return (
    <main className="pageMain">
      {isErrorState && (
        <div className="card" style={{ marginBottom: "2rem", borderColor: "#dc3545", backgroundColor: "#fff5f5" }}>
          <h2 style={{ color: "#dc3545", marginTop: 0 }}>⚠️ 인증 실패</h2>
          <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>{errorMessage}</p>
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

      <section className="card heroLandscape">
        <div className="heroText">
          <p className="eyebrow">ReviewBoost for E-commerce</p>
          <h1 className="heroTitle">리뷰를 업로드하면 바로바로 개선 액션이 완성됩니다.</h1>
          <p className="heroLead">
            리뷰 CSV를 올리면 부정 리뷰를 분류하고, 카테고리별 이슈를 순위화해서
            바로 적용 가능한 상세페이지 문구와 CS, FAQ 제안까지 제공합니다.
          </p>
          <div className="actionRow actionRowLg">
            <a className="btn btnPrimary" href="/dashboard">
              CSV 올리고 분석하기
            </a>
            <a className="btn btnGhost" href="/help">
              사용법 보기
            </a>
          </div>
        </div>
        <a className="btn btnPrimary btnGhost" href="/sample.csv" download>
          샘플 CSV 바로 받기
        </a>
      </section>

      <div className="card trustStrip" aria-label="신뢰 포인트">
        <span className="trustItem">✓ 업로드부터 결과까지 1회 프로세스</span>
        <span className="trustItem">✓ 분석 규칙 기반의 보수적 분류</span>
        <span className="trustItem">✓ PDF 및 복붙용 문구 즉시 출력</span>
      </div>

      <div className="card">
        <h2>입문 4단계</h2>
        <p className="muted">처음 사용자도 2분 내 완료할 수 있습니다.</p>
        <div className="stepper" aria-label="진입 가이드">
          {steps.map((s, i) => (
            <div className={`step ${i === 0 ? "active" : ""}`} key={s}>
              <span className="stepNumber">{i + 1}</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>정확한 분류</h2>
          <p className="muted">리뷰를 감정/카테고리로 정렬해 핵심 이슈를 빠르게 보여줍니다.</p>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" />
              <span>배송/품질/가격/사용성/CS 분류</span>
            </li>
            <li className="checkItem">
              <span className="checkBox" />
              <span>부정 키워드 TOP 정렬</span>
            </li>
            <li className="checkItem">
              <span className="checkBox" />
              <span>우선순위 점수 기반 실행 후보 추출</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>바로 쓰는 제안</h2>
          <p className="muted">분석 결과를 즉시 실행 가능한 문장으로 변환합니다.</p>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" />
              <span>상세페이지 문구 6개</span>
            </li>
            <li className="checkItem">
              <span className="checkBox" />
              <span>CS 응대 템플릿 4개</span>
            </li>
            <li className="checkItem">
              <span className="checkBox" />
              <span>FAQ 6개 제안</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>리포트 중심 리텐션</h2>
          <p className="muted">
            분석 로그와 제안사항을 리포트로 정리해 팀 공유 및 보고용 PDF로 보관할 수 있습니다.
          </p>
          <div className="actionRow">
            <a className="btn" href="/dashboard">
              분석 시작하기
            </a>
            <a className="btn btnPrimary" href="/pricing">
              요금제 보기
            </a>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>처음이신가요?</h2>
        <p className="muted">가입이나 설정 없이도 분석은 바로 가능합니다. (저장 기능은 로그인으로 확장됩니다.)</p>
        <p className="muted">
          CSV 헤더는 어떤 이름이어도 괜찮습니다. 업로드 후 화면에서 &quot;리뷰 내용/별점/작성일&quot; 열만 선택해주면 됩니다.
        </p>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </div>
    </main>
  );
}
