import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "리뷰 수집기 익스텐션 개인정보처리방침 | ReviewBoost",
  description: "ReviewBoost 리뷰 수집기 크롬 익스텐션의 데이터 수집·이용·전송에 대한 개인정보처리방침.",
  robots: { index: true, follow: true }
};

export default function ExtensionPrivacyPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h1>리뷰 수집기 익스텐션 개인정보처리방침</h1>
        <p className="muted">
          <strong>시행일:</strong> 2026-06-29
          <br />
          <strong>대상:</strong> ReviewBoost 리뷰 수집기 (Chrome 확장 프로그램)
          <br />
          <strong>운영:</strong> Onnuri stationery ·{" "}
          <a className="link" href="https://reviewboost.co.kr" target="_blank" rel="noreferrer">
            https://reviewboost.co.kr
          </a>
        </p>

        <article className="legalDoc">
          <section className="legalSection">
            <h3>1. 단일 목적</h3>
            <p>
              이 익스텐션은 <strong>사용자가 현재 보고 있는 쿠팡·스마트스토어 상품 한 건의 리뷰</strong>를 수집해
              엑셀/CSV로 내려받거나 ReviewBoost 무료 분석으로 보내는 한 가지 목적만 수행합니다. 백그라운드 수집,
              예약 수집, 여러 상품 일괄 수집은 하지 않습니다.
            </p>
          </section>

          <section className="legalSection">
            <h3>2. 수집·처리하는 데이터</h3>
            <ul>
              <li>사용자가 “리뷰 수집” 버튼을 눌렀을 때, 현재 상품 페이지의 공개 리뷰(본문·별점·작성일 등)</li>
              <li>수집은 사용자의 브라우저 안에서만 일어나며, 사용자의 클릭으로만 시작됩니다.</li>
            </ul>
            <p>
              이메일·비밀번호·결제정보 등 개인 계정 정보는 익스텐션이 수집하지 않습니다.
            </p>
          </section>

          <section className="legalSection">
            <h3>3. 데이터 전송</h3>
            <p>
              사용자가 <strong>“ReviewBoost로 분석”</strong> 버튼을 누른 경우에 한해, 수집한 리뷰 텍스트가
              분석을 위해 ReviewBoost 서버(<code>reviewboost.co.kr</code>)로 전송됩니다. 엑셀/CSV 다운로드만
              사용할 경우 어떤 데이터도 외부로 전송되지 않으며 전부 브라우저 안에서 처리됩니다.
            </p>
            <p>전송된 리뷰는 감정·카테고리·키워드 분석과 리포트 생성에만 사용합니다.</p>
          </section>

          <section className="legalSection">
            <h3>4. 보관 및 이용</h3>
            <ul>
              <li>수집한 리뷰는 분석 리포트를 보여주기 위해 잠시 브라우저 로컬 저장소에 보관됩니다.</li>
              <li>분석을 위해 서버로 전송된 리뷰는 리포트 생성에만 사용하며 판매하지 않습니다.</li>
              <li>광고·마케팅 목적의 프로파일링에 사용하지 않습니다.</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>5. 권한</h3>
            <ul>
              <li>
                <code>activeTab</code> — 현재 활성 상품 탭에서 리뷰를 읽기 위해.
              </li>
              <li>
                <code>storage</code> — 분석 결과를 리포트 페이지로 넘기기 위한 임시 보관.
              </li>
              <li>쿠팡·스마트스토어 호스트 접근 — 해당 상품 페이지의 리뷰를 읽기 위해서만.</li>
            </ul>
          </section>

          <section className="legalSection">
            <h3>6. 원격 코드 없음</h3>
            <p>모든 로직은 확장 프로그램 패키지에 포함되어 있으며, 외부에서 코드를 내려받아 실행하지 않습니다.</p>
          </section>

          <section className="legalSection">
            <h3>7. 문의</h3>
            <p>
              이메일:{" "}
              <a className="link" href="mailto:kwan765@naver.com">
                kwan765@naver.com
              </a>
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
