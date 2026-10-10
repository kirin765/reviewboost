import React from "react";
import Link from "next/link";
import { supportedSites } from "@/lib/supported-sites";

export default function SupportedSites({ detailed = false }: { detailed?: boolean }) {
  return (
    <section className="card marketingSection" aria-labelledby="supported-sites-title">
      <p className="sectionEyebrow">리뷰 수집 지원 사이트</p>
      <h2 id="supported-sites-title" className="marketingArticleHeading text-balance">올리브영까지, {supportedSites.length}개 쇼핑몰 리뷰를 파일로</h2>
      <p className="muted text-pretty">상품 페이지에서 ReviewBoost 확장 프로그램을 열고 리뷰를 수집한 뒤 CSV 또는 엑셀로 저장하세요.</p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-6">
        {supportedSites.map((site) => (
          <li key={site.key} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">{site.name}</h3>
            {detailed ? <><p className="text-sm muted break-words mt-2">{site.domain}</p><p className="text-sm muted mt-1">{site.page}</p></> : null}
          </li>
        ))}
      </ul>
      <p className="muted text-sm mt-4">올리브영은 확장 프로그램 1.5.2 이상에서 지원합니다. 브라우저별 스토어 심사와 업데이트 시점에 따라 새 버전 제공 시점이 다를 수 있습니다.</p>
      <div className="actionRow mt-4">
        {!detailed ? <Link className="btn btnPrimary" href="/extension">지원 사이트·설치 방법 보기</Link> : null}
        <Link className="btn btnOutline" href="/help/oliveyoung-review-csv-export">올리브영 리뷰 다운로드 방법</Link>
      </div>
    </section>
  );
}
