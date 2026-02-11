export const metadata = {
  title: "이용약관 | ReviewBoost"
};

export default function TermsPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h2>이용약관</h2>
        <p className="muted">시행일: 2026-02-11</p>
        <div className="list" style={{ marginTop: 14 }}>
          <div className="row">
            <div className="left">1. 목적</div>
            <div className="right">본 약관은 ReviewBoost 서비스 이용 조건과 절차, 회사와 이용자의 권리/의무를 정합니다.</div>
          </div>
          <div className="row">
            <div className="left">2. 계정</div>
            <div className="right">
              이용자는 본인 이메일로 계정을 생성해야 하며, 계정 정보 관리 책임은 이용자에게 있습니다.
            </div>
          </div>
          <div className="row">
            <div className="left">3. 금지행위</div>
            <div className="right">법령 위반, 타인 정보 도용, 서비스 운영을 방해하는 행위를 금지합니다.</div>
          </div>
          <div className="row">
            <div className="left">4. 업로드 데이터</div>
            <div className="right">이용자는 적법하게 수집한 데이터만 업로드해야 하며, 민감정보 포함 업로드를 금지합니다.</div>
          </div>
          <div className="row">
            <div className="left">5. 책임 제한</div>
            <div className="right">회사는 천재지변 등 불가항력으로 인한 손해에 대해 법령 범위 내에서 책임을 부담합니다.</div>
          </div>
          <div className="row">
            <div className="left">6. 문의</div>
            <div className="right">문의: support@reviewboost.local</div>
          </div>
        </div>
      </div>
    </main>
  );
}
