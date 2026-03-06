import FeedbackModal from "@/components/FeedbackModal";

export default async function HomePage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await props.searchParams) ?? {};
  const err = typeof sp.error === "string" ? sp.error : "";
  const errCode = typeof sp.error_code === "string" ? sp.error_code : "";
  const errDesc = typeof sp.error_description === "string" ? sp.error_description : "";
  const notice = typeof sp.notice === "string" ? sp.notice : "";

  let errorMessage = err;
  let showResendOption = false;
  if (errCode === "otp_expired" || errDesc.includes("expired")) {
    errorMessage = "이메일 인증 링크가 만료되었습니다. 다시 회원가입을 시도해주세요.";
    showResendOption = true;
  } else if (errCode === "access_denied") {
    errorMessage = "이메일 인증에 실패했습니다. 링크가 이미 사용되었거나 유효하지 않을 수 있습니다.";
    showResendOption = true;
  } else if (errDesc) {
    errorMessage = errDesc.replace(/\+/g, " ");
  }

  const isErrorState = !!errorMessage;
  const steps = ["CSV 업로드", "열 매핑", "자동 분석", "개선 결과 확인"];
  const signalCards = [
    { label: "입력 포맷", value: "CSV", meta: "드래그 앤 드롭 또는 샘플 파일" },
    { label: "분석 흐름", value: "4 step", meta: "업로드부터 PDF까지 한 화면" },
    { label: "출력 방식", value: "Report", meta: "핵심 지표와 실행 액션 카드" },
    { label: "공유 포맷", value: "PDF", meta: "저장 없이도 즉시 공유 가능" }
  ];
  const featureCards = [
    {
      title: "정확한 분류",
      body: "리뷰를 감정과 카테고리 기준으로 정렬해 가장 먼저 해결할 이슈를 드러냅니다.",
      items: ["배송/품질/가격/사용성/CS 분류", "부정 키워드 TOP 정렬", "우선순위 점수 기반 실행 후보 추출"]
    },
    {
      title: "바로 쓰는 제안",
      body: "분석 결과를 그대로 복붙 가능한 문장과 대응안으로 변환합니다.",
      items: ["상세페이지 문구 6개", "CS 응대 템플릿 4개", "FAQ 6개 제안"]
    },
    {
      title: "리포트 중심 운영",
      body: "팀 공유와 보고용 PDF, 저장 히스토리, 반복 분석 동선을 하나의 대시보드로 묶습니다.",
      items: ["저장된 분석 재확인", "PDF 즉시 다운로드", "로그인 시 리포트 보관/관리"]
    }
  ];

  return (
    <main className="pageMain marketingPage">
      {isErrorState ? (
        <div className="card errorCard">
          <h2 className="errorTitle">인증 실패</h2>
          <p className="errorMessage">{errorMessage}</p>
          {showResendOption ? (
            <div className="actionRow">
              <a className="btn btnPrimary" href="/signup">
                다시 가입하기
              </a>
              <a className="btn" href="/help">
                도움말 보기
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
      {!isErrorState && notice ? <FeedbackModal title="안내" message={notice} /> : null}

      <section className="card marketingHero">
        <div className="marketingHeroCopy">
          <p className="eyebrow">Review operations dashboard</p>
          <h1 className="marketingTitle">리뷰를 업로드하면 우선순위와 실행 액션이 바로 정리됩니다.</h1>
          <p className="marketingLead">
            리뷰 CSV를 올리면 부정 리뷰를 분류하고, 카테고리별 이슈를 순위화해서 바로 적용 가능한 상세페이지 문구와 CS,
            FAQ 제안까지 제공합니다.
          </p>
          <div className="actionRow actionRowLg">
            <a className="btn btnPrimary" href="/dashboard">
              CSV 올리고 분석하기
            </a>
            <a className="btn btnGhost" href="/help">
              사용법 보기
            </a>
            <a className="btn btnOutline" href="/sample.csv" download>
              샘플 CSV 받기
            </a>
          </div>
        </div>

        <div className="marketingHeroPanel" aria-label="대시보드 신호 카드">
          <div className="marketingSignalGrid">
            {signalCards.map((card) => (
              <article className="marketingSignalCard" key={card.label}>
                <span className="marketingSignalLabel">{card.label}</span>
                <strong className="marketingSignalValue">{card.value}</strong>
                <span className="marketingSignalMeta">{card.meta}</span>
              </article>
            ))}
          </div>
          <div className="marketingPreviewCard">
            <div className="marketingPreviewHeader">
              <span className="marketingPreviewBadge">Live workflow</span>
              <span className="marketingPreviewMuted">업로드부터 결과까지 1회 흐름</span>
            </div>
            <div className="stepper marketingStepper" aria-label="진입 가이드">
              {steps.map((step, index) => (
                <div className={`step ${index === 0 ? "active" : ""}`} key={step}>
                  <span className="stepNumber">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketingTrustRow" aria-label="신뢰 포인트">
        <span className="trustItem">업로드부터 결과까지 한 워크플로</span>
        <span className="trustItem">분석 규칙 기반의 보수적 분류</span>
        <span className="trustItem">PDF와 복붙용 문구 즉시 출력</span>
      </section>

      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">Core outcomes</p>
          <h2>리뷰를 정리하는 데서 끝나지 않고, 바로 행동 가능한 결과로 연결합니다.</h2>
          <p className="muted">현재 도메인 구조는 유지하면서 SaaS 대시보드 톤으로 경험을 다시 정리했습니다.</p>
        </div>
        <div className="marketingFeatureGrid">
          {featureCards.map((feature) => (
            <article className="marketingFeatureCard" key={feature.title}>
              <h3>{feature.title}</h3>
              <p className="muted">{feature.body}</p>
              <ul className="checklist marketingChecklist">
                {feature.items.map((item) => (
                  <li className="checkItem" key={item}>
                    <span className="checkBox" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">How it starts</p>
          <h2>처음 사용자도 2분 안에 분석을 시작할 수 있습니다.</h2>
          <p className="muted">가입 없이 분석을 먼저 체험하고, 필요할 때 저장 기능으로 확장합니다.</p>
        </div>
        <div className="marketingStepGrid">
          {steps.map((step, index) => (
            <article className="marketingStepCard" key={step}>
              <span className="marketingStepIndex">0{index + 1}</span>
              <h3>{step}</h3>
              <p className="muted">
                {index === 0
                  ? "리뷰 CSV를 업로드하거나 샘플 파일로 바로 테스트합니다."
                  : index === 1
                    ? "리뷰 내용, 별점, 작성일 열을 빠르게 매핑합니다."
                    : index === 2
                      ? "AI가 부정 키워드, 카테고리, 우선순위를 계산합니다."
                      : "핵심 지표, 액션 아이템, PDF 리포트로 결과를 확인합니다."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>가입이나 설정 없이도 분석은 바로 가능합니다.</h2>
          <p className="muted">
            CSV 헤더는 어떤 이름이어도 괜찮습니다. 업로드 후 화면에서 &quot;리뷰 내용/별점/작성일&quot; 열만 선택하면 됩니다.
          </p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            분석 시작하기
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </section>
    </main>
  );
}
