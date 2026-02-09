export default function PricingPage() {
  return (
    <main style={{ marginTop: 18 }}>
      <div className="card">
        <h2>요금제 (MVP)</h2>
        <p className="muted">현재는 데모 성격의 MVP로, 실제 결제는 붙어있지 않습니다.</p>
      </div>

      <div className="grid">
        <div className="card">
          <h2>무료</h2>
          <p className="muted">1회 분석</p>
          <div className="list">
            <div className="row">
              <div className="left">CSV 업로드</div>
              <div className="right">1회</div>
            </div>
            <div className="row">
              <div className="left">PDF 리포트</div>
              <div className="right">포함</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Basic</h2>
          <p className="muted">월 49,000원 (예정)</p>
          <div className="list">
            <div className="row">
              <div className="left">분석 횟수</div>
              <div className="right">무제한(예정)</div>
            </div>
            <div className="row">
              <div className="left">저장된 리포트</div>
              <div className="right">로그인 시 제공(예정)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Pro</h2>
          <p className="muted">월 89,000원 (예정)</p>
          <div className="list">
            <div className="row">
              <div className="left">경쟁사 리뷰 분석</div>
              <div className="right">2단계</div>
            </div>
            <div className="row">
              <div className="left">팀 공유</div>
              <div className="right">예정</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>다음 구현</h2>
          <p className="muted">
            다음 단계는 로그인 기반 저장 기능, 결제, 경쟁사 리뷰 업로드/비교 리포트입니다.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn btnPrimary" href="/dashboard">
              지금 분석하기
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
