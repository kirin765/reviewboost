export default function HelpPage() {
  return (
    <main style={{ marginTop: 18 }}>
      <div className="card">
        <h2>사용법</h2>
        <p className="muted">개발 지식 없이도, CSV만 있으면 바로 리뷰 분석을 할 수 있습니다.</p>
      </div>

      {/* 4-Step Guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 20 }}>
        <div className="step completed">
          <span className="stepNumber">1</span>
          <span>CSV 준비</span>
        </div>
        <div className="step">
          <span className="stepNumber">2</span>
          <span>업로드</span>
        </div>
        <div className="step">
          <span className="stepNumber">3</span>
          <span>분석</span>
        </div>
        <div className="step">
          <span className="stepNumber">4</span>
          <span>결과 활용</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>1) CSV 준비</h2>
          <div className="list">
            <div className="row">
              <div className="left">필수</div>
              <div className="right">리뷰 내용(텍스트)</div>
            </div>
            <div className="row">
              <div className="left">권장</div>
              <div className="right">별점(0~5)</div>
            </div>
            <div className="row">
              <div className="left">선택</div>
              <div className="right">작성일(최근 이슈 확인용)</div>
            </div>
          </div>
          <p className="hint muted" style={{ marginTop: 10 }}>
            엑셀에서 저장할 때는 보통 <strong>CSV(쉼표로 구분)</strong> 형식으로 저장하면 됩니다.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn" href="/sample.csv" download>
              샘플 CSV(컬럼 많음)
            </a>
            <a className="btn" href="/sample_simple.csv" download>
              샘플 CSV(간단)
            </a>
          </div>
        </div>

        <div className="card">
          <h2>2) 업로드 후 컬럼 확인</h2>
          <p className="muted">
            업로드하면 미리보기로 &ldquo;어느 열이 리뷰 내용인지, 별점인지, 작성일인지&rdquo;를 한 번 확인합니다.
          </p>
          <p className="hint muted">
            컬럼명이 <code>review_text</code>, <code>내용</code>, <code>리뷰</code> 처럼 다양해도 괜찮습니다. 화면에서 선택만
            해주면 됩니다.
          </p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>3) 결과 활용</h2>
          <p className="muted">분석 결과에서 확인 가능한 항목들:</p>
          <ul className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>핵심 지표 (리뷰 수, 부정 비율, 평균 별점, 우선순위 점수)</li>
            <li>부정 키워드 TOP10</li>
            <li>카테고리별 문제 분포</li>
            <li>긴급 대응 필요 리뷰</li>
            <li>우선순위 매트릭스</li>
            <li>별점 시뮬레이션</li>
            <li>개선 제안 (상세페이지 문구, CS응대, FAQ)</li>
          </ul>
          <p className="hint muted" style={{ marginTop: 12 }}>
            결과에 나오는 문구는 바로 복사해서 상세페이지/CS 답변/FAQ에 붙여 넣을 수 있습니다.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn btnPrimary" href="/dashboard">
              지금 분석하기
            </a>
          </div>
        </div>

        <div className="card">
          <h2>저장(선택)</h2>
          <p className="muted">
            로그인 기능을 켜면 분석 결과를 저장하고, 나중에 &ldquo;저장된 리포트&rdquo;에서 다시 볼 수 있습니다.
          </p>
          <p className="hint muted">
            PDF 다운로드로 분석 결과를 공유할 수도 있습니다.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="card" style={{ marginTop: 20 }}>
        <h2>자주 묻는 질문 (FAQ)</h2>
        <div className="list">
          <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Q: 리뷰가 너무 많으면 어떻게 되나요?</div>
            <div className="muted" style={{ fontSize: 14 }}>A: 대량 리뷰는 샘플링하여 분석합니다. (Basic 이상은 180건, Pro는 대량 우선 처리)</div>
          </div>
          <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Q: 분석 결과는 어디서 보나요?</div>
            <div className="muted" style={{ fontSize: 14 }}>A: 분석 완료 후 화면에 바로 표시되며, PDF로도 다운로드 가능합니다.</div>
          </div>
          <div className="row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Q: 로그인 없이도 분석 가능한가요?</div>
            <div className="muted" style={{ fontSize: 14 }}>A: 네, 로그인 없이도 CSV만 업로드하면 분석을 진행할 수 있습니다.</div>
          </div>
        </div>
      </div>
    </main>
  );
}

