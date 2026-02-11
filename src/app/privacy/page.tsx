export const metadata = {
  title: "개인정보 처리방침 | ReviewBoost"
};

export default function PrivacyPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h2>개인정보 처리방침</h2>
        <p className="muted">시행일: 2026-02-11</p>
        <div className="list" style={{ marginTop: 14 }}>
          <div className="row">
            <div className="left">1. 수집 항목</div>
            <div className="right">회원가입 시 이메일 주소를 수집합니다.</div>
          </div>
          <div className="row">
            <div className="left">2. 처리 목적</div>
            <div className="right">회원 식별, 로그인 인증, 계정 관리, 서비스 관련 고지 전달</div>
          </div>
          <div className="row">
            <div className="left">3. 보유 기간</div>
            <div className="right">회원 탈퇴 시까지 보관하며, 관계 법령에 따라 필요한 경우 해당 기간 보관합니다.</div>
          </div>
          <div className="row">
            <div className="left">4. 제3자 제공</div>
            <div className="right">원칙적으로 이용자 동의 없이 개인정보를 외부에 제공하지 않습니다.</div>
          </div>
          <div className="row">
            <div className="left">5. 처리 위탁</div>
            <div className="right">서비스 운영에 필요한 범위에서 클라우드/인증/메일 발송 업무를 위탁할 수 있습니다.</div>
          </div>
          <div className="row">
            <div className="left">6. 권리 행사</div>
            <div className="right">이용자는 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.</div>
          </div>
          <div className="row">
            <div className="left">7. 문의</div>
            <div className="right">개인정보 문의: privacy@reviewboost.local</div>
          </div>
          <div className="row">
            <div className="left">8. 안전성 확보조치</div>
            <div className="right">접근권한 관리, 접근통제, 전송 구간 보호 등 합리적인 보호조치를 시행합니다.</div>
          </div>
        </div>
      </div>
    </main>
  );
}
