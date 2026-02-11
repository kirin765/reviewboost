export default function PricingPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h2>요금제 (MVP)</h2>
        <p className="muted">현재는 MVP 단계이며, 아래 구성/가격은 운영 중 조정될 수 있습니다.</p>
      </div>

      <div className="grid">
        <div className="card">
          <h2>무료</h2>
          <p className="muted">체험/초기 유입용 (베타 기간)</p>
          <div className="list">
            <div className="row">
              <div className="left">CSV 업로드/분석</div>
              <div className="right">월 30회</div>
            </div>
            <div className="row">
              <div className="left">PDF 리포트</div>
              <div className="right">포함</div>
            </div>
            <div className="row">
              <div className="left">저장 히스토리</div>
              <div className="right">최근 3개</div>
            </div>
            <div className="row">
              <div className="left">지원</div>
              <div className="right">기본 이메일</div>
            </div>
            <div className="row">
              <div className="left">AI 고급 분석</div>
              <div className="right">미포함</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Basic</h2>
          <p className="muted">월 49,000원 (1인 실사용 추천)</p>
          <div className="list">
            <div className="row">
              <div className="left">분석 횟수</div>
              <div className="right">월 500회</div>
            </div>
            <div className="row">
              <div className="left">저장 히스토리</div>
              <div className="right">최대 500개</div>
            </div>
            <div className="row">
              <div className="left">AI 고급 분석</div>
              <div className="right">포함</div>
            </div>
            <div className="row">
              <div className="left">PDF 워터마크</div>
              <div className="right">제거</div>
            </div>
            <div className="row">
              <div className="left">지원</div>
              <div className="right">우선 이메일</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Pro</h2>
          <p className="muted">월 89,000원 (팀/에이전시용)</p>
          <div className="list">
            <div className="row">
              <div className="left">분석 횟수</div>
              <div className="right">월 1,500회</div>
            </div>
            <div className="row">
              <div className="left">팀원 좌석</div>
              <div className="right">최대 5명</div>
            </div>
            <div className="row">
              <div className="left">경쟁사 비교 분석</div>
              <div className="right">포함</div>
            </div>
            <div className="row">
              <div className="left">팀 공유</div>
              <div className="right">포함</div>
            </div>
            <div className="row">
              <div className="left">지원</div>
              <div className="right">최우선 지원</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>안내</h2>
          <p className="muted">현재는 MVP 단계로, 실제 결제/과금 집행은 순차 적용 예정입니다.</p>
          <p className="muted">요금제별 제한은 운영 데이터에 따라 조정될 수 있으며 사전 공지됩니다.</p>
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              지금 분석하기
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
