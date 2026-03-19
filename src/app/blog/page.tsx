import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "블로그 - 쿠팡 리뷰 분석 & 스마트스토어 운영 팁",
  description:
    "쿠팡 리뷰 분석, 부정리뷰 대응법, 스마트스토어 리뷰 관리, 매출 올리는 법 등 이커머스 셀러를 위한 실전 가이드를 제공합니다.",
  keywords: [
    "쿠팡 리뷰 분석",
    "쿠팡 부정리뷰 대응",
    "쿠팡 매출 올리는 법",
    "스마트스토어 리뷰 관리",
    "쿠팡 별점 낮아지는 이유",
    "쿠팡 리뷰 삭제 가능",
    "쿠팡 리뷰 csv 추출"
  ],
  alternates: { canonical: "/blog" }
};

const posts = [
  {
    slug: "coupang-review-analysis",
    title: "쿠팡 리뷰 분석, 왜 중요한가?",
    summary:
      "쿠팡 셀러라면 리뷰 데이터를 체계적으로 분석해야 합니다. CSV로 추출한 리뷰를 AI로 분류하고, 부정 키워드를 찾아 우선순위를 매기는 방법을 알아봅니다.",
    tag: "리뷰 분석"
  },
  {
    slug: "coupang-negative-review-response",
    title: "쿠팡 부정리뷰 대응: 별점 회복 전략",
    summary:
      "부정 리뷰를 무시하면 별점이 떨어지고 매출에 직접적인 영향을 줍니다. 카테고리별 부정 키워드를 분석하고, 상세페이지 수정과 CS 응대 템플릿으로 대응하는 실전 가이드입니다.",
    tag: "부정리뷰 대응"
  },
  {
    slug: "smartstore-review-management",
    title: "스마트스토어 리뷰 관리 완벽 가이드",
    summary:
      "스마트스토어에서 리뷰를 효과적으로 관리하는 방법, CSV 추출부터 감성 분석, FAQ 자동 생성까지 한 화면에서 처리하는 워크플로를 소개합니다.",
    tag: "리뷰 관리"
  },
  {
    slug: "coupang-rating-drop-reasons",
    title: "쿠팡 별점이 떨어지는 5가지 이유와 해결법",
    summary:
      "배송, 품질, 가격, 사용성, CS — 별점 하락의 주요 원인을 카테고리별로 분석하고, 각각에 대한 구체적인 개선 방안을 제시합니다.",
    tag: "별점 관리"
  },
  {
    slug: "coupang-review-csv-export",
    title: "쿠팡 리뷰 CSV 추출하는 방법",
    summary:
      "쿠팡에서 리뷰 데이터를 CSV로 추출하고, ReviewBoost에 업로드하여 감성 분석과 카테고리 분류를 자동으로 실행하는 단계별 가이드입니다.",
    tag: "CSV 활용"
  },
  {
    slug: "increase-coupang-sales-with-reviews",
    title: "쿠팡 매출 올리는 법: 리뷰 데이터 활용 전략",
    summary:
      "리뷰 분석 결과를 상세페이지 개선, CS 응대 최적화, FAQ 작성에 활용해서 전환율과 매출을 끌어올리는 실전 전략을 공유합니다.",
    tag: "매출 향상"
  }
];

export default function BlogPage() {
  return (
    <main className="pageMain marketingPage">
      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">Blog</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
            이커머스 셀러를 위한 리뷰 분석 가이드
          </h1>
          <p className="muted">
            쿠팡·스마트스토어 리뷰 관리, 부정리뷰 대응, 매출 향상 전략을 실전 중심으로 다룹니다.
          </p>
        </div>
        <div className="marketingFeatureGrid">
          {posts.map((post) => (
            <article className="marketingFeatureCard" key={post.slug}>
              <span className="badge">{post.tag}</span>
              <h3 style={{ marginTop: 8 }}>{post.title}</h3>
              <p className="muted">{post.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>리뷰 분석, 지금 바로 시작해보세요.</h2>
          <p className="muted">
            CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.
          </p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            무료로 분석 시작
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </section>
    </main>
  );
}
