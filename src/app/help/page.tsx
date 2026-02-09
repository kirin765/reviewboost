export default function HelpPage() {
  return (
    <main style={{ marginTop: 18 }}>
      <div className="card">
        <h2>사용법</h2>
        <p className="muted">개발 지식 없이도, CSV만 있으면 바로 리뷰 분석을 할 수 있습니다.</p>
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
            업로드하면 미리보기로 “어느 열이 리뷰 내용인지, 별점인지, 작성일인지”를 한 번 확인합니다.
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
          <p className="muted">결과에 나오는 문구는 바로 복사해서 상세페이지/CS 답변/FAQ에 붙여 넣을 수 있습니다.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn btnPrimary" href="/dashboard">
              지금 분석하기
            </a>
          </div>
        </div>

        <div className="card">
          <h2>저장(선택)</h2>
          <p className="muted">
            로그인 기능을 켜면 분석 결과를 저장하고, 나중에 “저장된 리포트”에서 다시 볼 수 있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}

