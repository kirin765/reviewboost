export default function HelpChecklistPage() {
  return (
    <main className="pageMain">
      <div className="card">
        <h2>체크리스트</h2>
        <p className="muted">CSV 업로드부터 결과 적용까지, 처음 진입 시 이것만 보면 됩니다.</p>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            지금 분석하기
          </a>
          <a className="btn" href="/sample.csv" download>
            샘플 CSV(컬럼 많음)
          </a>
          <a className="btn" href="/sample_simple.csv" download>
            샘플 CSV(간단)
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>1) 준비물</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                <strong>리뷰 내용(텍스트) 열</strong>이 반드시 필요합니다.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                (권장) <strong>별점(0~5)</strong>이 있으면 부정 비율/우선순위가 더 정확해집니다.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                (선택) <strong>작성일</strong>이 있으면 최근 이슈를 더 쉽게 잡아냅니다.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                파일은 <strong>CSV(.csv)</strong>로 저장해주세요. (가능하면 <strong>CSV UTF-8</strong>)
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                파일이 너무 크면 실패할 수 있어요. <strong>6MB 이하</strong>를 권장합니다.
              </div>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>2) CSV 내보내기</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                엑셀: <strong>파일</strong> &gt; <strong>다른 이름으로 저장</strong> &gt;{" "}
                <strong>CSV(쉼표로 구분)</strong> 또는 <strong>CSV UTF-8</strong>
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                구글 스프레드시트: <strong>파일</strong> &gt; <strong>다운로드</strong> &gt;{" "}
                <strong>쉼표로 구분된 값(.csv)</strong>
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                문자가 깨지면(예: <code>����</code>): <strong>CSV UTF-8</strong>로 다시 저장해서 업로드하세요.
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>3) 업로드 후 할 일</h2>
          <p className="muted">업로드 후에는 “컬럼 선택”만 정확히 해주면 나머지는 자동입니다.</p>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                미리보기에서 <strong>리뷰 내용</strong> 열이 맞는지 확인합니다.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                (있다면) <strong>별점</strong>, <strong>작성일</strong> 열도 지정합니다.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                결과 화면에서 문구를 <strong>복사</strong>해 상세페이지/CS/FAQ에 붙여 넣습니다.
              </div>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2>공유/저장(선택)</h2>
          <ul className="checklist">
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                저장 기능이 켜져 있으면 <strong>저장된 리포트</strong>에서 다시 열 수 있어요.
              </div>
            </li>
            <li className="checkItem">
              <span className="checkBox" aria-hidden />
              <div className="checkText">
                저장 기능이 꺼져 있어도 <strong>PDF</strong>로 공유할 수 있습니다.
              </div>
            </li>
          </ul>
          <details className="details" style={{ marginTop: 12 }}>
            <summary className="detailsSummary">자주 막히는 지점</summary>
            <div className="muted" style={{ marginTop: 8 }}>
              <div>- 파일이 안 올라가면: CSV(.csv)인지, 6MB 이하인지 확인</div>
              <div>- 문자가 깨지면: CSV UTF-8로 다시 저장</div>
              <div>- 열 이름이 제각각이어도: 업로드 후 화면에서 직접 선택 가능</div>
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}

