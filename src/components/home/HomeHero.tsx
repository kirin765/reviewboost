import React from "react";
import { buttonStyles } from "@/components/ui/Button";
import ExtensionInstallLink from "@/components/extension/ExtensionInstallLink";

const sampleReviews = [
  { rating: "5.0", date: "2026-10-05", text: "포장이 꼼꼼하고 배송이 빨랐어요." },
  { rating: "3.0", date: "2026-10-04", text: "크기를 비교할 사진이 있으면 좋겠어요." },
  { rating: "4.0", date: "2026-10-03", text: "사용법이 간단해서 매일 쓰고 있어요." },
];

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={down ? "size-5 rotate-90" : "size-5"}>
      <path d="M4 12h15m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeHero() {
  return (
    <section aria-labelledby="home-hero-heading" className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0 py-2 lg:py-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-[var(--rb-border)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--rb-muted-strong)]">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--rb-accent)]" />
          Chrome 확장 프로그램 · 12개 쇼핑몰 지원
        </p>
        <h1 id="home-hero-heading" className="mt-6 text-balance break-keep text-4xl font-semibold leading-tight sm:text-5xl xl:text-6xl">
          쇼핑몰 리뷰 수집부터<br />
          <span className="text-[var(--rb-accent)]">엑셀 정리까지.</span>
        </h1>
        <p className="mt-6 max-w-lg text-pretty break-keep text-base leading-8 text-[var(--rb-muted-strong)] sm:text-lg">
          복사하고, 붙여넣고, 정리하던 리뷰.<br />
          이제 ReviewBoost 확장 프로그램으로 모으세요.<br />
          쿠팡·스마트스토어 상품 페이지에서 엑셀·CSV로 바로 저장합니다.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ExtensionInstallLink placement="home_hero" className={buttonStyles({ variant: "primary", size: "lg", className: "gap-3 shadow-sm" })}>
            Chrome에 무료로 설치 <Arrow />
          </ExtensionInstallLink>
          <a href="#how-to" className={buttonStyles({ variant: "secondary", size: "lg" })}>사용 방법 보기</a>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--rb-muted-strong)]">
          <span><span aria-hidden="true" className="mr-1.5 text-[var(--rb-accent)]">✓</span>하루 50개 무료</span>
          <span><span aria-hidden="true" className="mr-1.5 text-[var(--rb-accent)]">✓</span>수집 시작에 회원가입 불필요</span>
        </div>
        <p className="mt-3 text-pretty text-xs text-[var(--rb-muted-strong)]">데스크톱 Chrome에서 설치할 수 있습니다.</p>
      </div>

      <figure className="min-w-0 rounded-3xl border border-[var(--rb-border)] bg-[var(--surface-soft)] p-4 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 text-xs font-medium text-[var(--rb-muted-strong)]">
          <span>리뷰가 파일이 되는 순간</span>
          <span className="rounded-full border border-[var(--rb-border)] px-2.5 py-1">예시 데이터</span>
        </div>

        <div className="mr-4 rounded-2xl border border-[var(--rb-border)] bg-white shadow-sm sm:mr-10">
          <div className="flex items-center gap-3 border-b border-[var(--rb-border)] px-4 py-3">
            <span aria-hidden="true" className="flex gap-1"><span className="size-1.5 rounded-full bg-slate-300" /><span className="size-1.5 rounded-full bg-slate-300" /><span className="size-1.5 rounded-full bg-slate-300" /></span>
            <span className="flex-1 rounded-md bg-[var(--rb-bg)] px-3 py-1 text-xs text-[var(--rb-muted-strong)]">쇼핑몰 · 상품 리뷰</span>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">고객이 남긴 이야기</p>
              <span className="text-xs text-[var(--rb-muted-strong)]">리뷰 3개</span>
            </div>
            <div className="mt-3 space-y-3">
              {sampleReviews.slice(0, 2).map(review => (
                <div key={review.date} className="rounded-lg bg-[var(--rb-bg)] px-3 py-2.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-[var(--rb-accent)]"><span aria-hidden="true">★ </span><span className="sr-only">별점 </span>{review.rating}</span>
                    <span className="text-[var(--rb-muted-strong)]">{review.date}</span>
                  </div>
                  <p className="mt-1 text-pretty text-xs leading-6 text-[var(--rb-muted-strong)]">{review.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-[var(--rb-accent)]">
          <Arrow down />
          <span>ReviewBoost 확장 프로그램으로 수집</span>
        </div>

        <div className="ml-4 overflow-hidden rounded-2xl border border-[var(--rb-border)] bg-white shadow-md sm:ml-10">
          <div className="flex items-center gap-3 bg-[var(--rb-fg)] px-4 py-3 text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-8 shrink-0"><path d="M5 3h9l5 5v13H5zM14 3v5h5M8 12h8M8 16h8M12 12v7" strokeLinejoin="round" /></svg>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">review_sample.xlsx</p><p className="mt-0.5 text-xs text-slate-300">리뷰 본문 · 별점 · 작성일</p></div>
            <span className="text-xs">엑셀·CSV</span>
          </div>
          <table className="w-full table-fixed text-left text-xs">
            <caption className="sr-only">엑셀로 정리한 리뷰 예시</caption>
            <thead className="bg-[var(--rb-bg)] text-[var(--rb-muted-strong)]"><tr><th scope="col" className="w-14 px-3 py-2.5 font-medium">별점</th><th scope="col" className="w-24 py-2.5 font-medium">작성일</th><th scope="col" className="py-2.5 pr-3 font-medium">리뷰 내용</th></tr></thead>
            <tbody>{sampleReviews.map(review => (
              <tr key={review.date} className="border-t border-[var(--rb-border)] text-[var(--rb-muted-strong)]">
                <td className="px-3 py-3 tabular-nums">{review.rating}</td><td className="py-3 tabular-nums">{review.date}</td><td className="truncate py-3 pr-3">{review.text}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="flex items-center gap-2 border-t border-[var(--rb-border)] px-4 py-3 text-xs font-medium text-[var(--rb-accent)]"><span aria-hidden="true">✓</span>리뷰 3개, 하나의 파일로 정리 완료</p>
        </div>
        <figcaption className="mt-4 text-pretty text-center text-xs leading-5 text-[var(--rb-muted-strong)]">이미지 URL 등 추가 항목은 쇼핑몰이 제공하는 경우 포함됩니다.</figcaption>
      </figure>
    </section>
  );
}
