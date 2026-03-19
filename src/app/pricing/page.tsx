import React from "react";
import type { Metadata } from "next";
import PricingActions from "@/components/PricingActions";

export const metadata: Metadata = {
  title: "요금제 - ReviewBoost AI 리뷰 분석 플랜 비교",
  description: "ReviewBoost 무료·Basic·Pro 플랜을 비교하세요. 월 100회 무료 분석부터 대량 리뷰 분석까지, 이커머스 셀러에 맞는 요금제를 선택하세요.",
  alternates: { canonical: "/pricing" }
};
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { paddlePriceIdForPlan } from "@/lib/paddle";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: Promise<{ billing?: string; [key: string]: string | string[] | undefined }>;
}) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  const safePlanPriceId = (plan: "basic" | "pro") => {
    try {
      return paddlePriceIdForPlan(plan);
    } catch {
      return undefined;
    }
  };

  try {
    const supabase = await createSupabaseServerComponentClient();
    const result = await supabase.auth.getUser();
    userId = result?.data?.user?.id ?? null;
    userEmail = result?.data?.user?.email ?? null;
  } catch {
    // ignore and keep unauthenticated state
  }

  const basicPriceId = safePlanPriceId("basic");
  const proPriceId = safePlanPriceId("pro");
  const billing = (await searchParams)?.billing;
  const pricingStats = [
    { label: "무료", value: "월 5회", meta: "워터마크 포함 PDF" },
    { label: "Basic", value: "월 39,000원", meta: "1인 실사용 추천" },
    { label: "Pro", value: "월 89,000원", meta: "팀/에이전시용" }
  ];

  return (
    <main className="pageMain pricingPage">
      <section className="card pricingHero">
        <div className="pricingHeroHeader">
          <div>
            <p className="sectionEyebrow">Pricing</p>
            <h1>리뷰 운영 성숙도에 맞춰 기능을 확장하세요.</h1>
            <p className="muted pricingHeroLead">
              운영 규모에 맞춰 플랜을 선택하고, 필요할 때 언제든 변경할 수 있습니다.
            </p>
          </div>
          <div className="pricingHeroMeta">
            <span className="pill pillActive">안전한 카드 결제</span>
            <span className="pill">저장/공유 기능과 연계</span>
          </div>
        </div>

        <div className="pricingHeroStats">
          {pricingStats.map((item) => (
            <article className="pricingHeroStat" key={item.label}>
              <span className="pricingHeroStatLabel">{item.label}</span>
              <strong className="pricingHeroStatValue">{item.value}</strong>
              <span className="pricingHeroStatMeta">{item.meta}</span>
            </article>
          ))}
        </div>

        {billing === "success" ? <p className="hint pricingBillingNotice">결제가 완료되었습니다. 구독 상태 반영까지 최대 1분 정도 소요될 수 있습니다.</p> : null}
        {billing === "cancel" ? <p className="hint pricingBillingNotice">결제가 취소되었습니다. 다시 시도하실 수 있습니다.</p> : null}
      </section>

      <div className="pricingCardGrid">
        <article className="card pricingCard">
          <header className="pricingCardHeader">
            <div>
              <p className="pricingPlanLabel">Starter</p>
              <h2>무료</h2>
            </div>
            <p className="pricingValue">₩0</p>
            <p className="muted pricingPlanMeta">기본 분석 체험용</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row">
                <div className="left">CSV 업로드/분석</div>
                <div className="right">월 5회</div>
              </div>
              <div className="row">
                <div className="left">1회 분석당 리뷰 수</div>
                <div className="right">최대 50개</div>
              </div>
              <div className="row">
                <div className="left">PDF 리포트</div>
                <div className="right">워터마크 포함</div>
              </div>
              <div className="row">
                <div className="left">저장 히스토리</div>
                <div className="right">최근 3개</div>
              </div>
              <div className="row">
                <div className="left">부정 키워드</div>
                <div className="right">TOP 5</div>
              </div>
              <div className="row">
                <div className="left">긴급 대응 리뷰</div>
                <div className="right">TOP 3</div>
              </div>
              <div className="row">
                <div className="left">우선순위 매트릭스</div>
                <div className="right">요약만</div>
              </div>
              <div className="row">
                <div className="left">분석 정밀도</div>
                <div className="right">기본 분석</div>
              </div>
            </div>
          </div>
          <footer className="pricingCardFooter" />
        </article>

        <article className="card pricingCard pricingCardPopular">
          <header className="pricingCardHeader">
            <div className="pricingCardHeaderRow">
              <div>
                <p className="pricingPlanLabel">Recommended</p>
                <h2>Basic</h2>
              </div>
              <span className="badge badgePrimary pricingBadge">추천</span>
            </div>
            <p className="pricingValue">₩39,000</p>
            <p className="muted pricingPlanMeta">월 39,000원 · 1인 실사용 추천</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row">
                <div className="left">분석 횟수</div>
                <div className="right">월 200회</div>
              </div>
              <div className="row">
                <div className="left">1회 분석당 리뷰 수</div>
                <div className="right">최대 500개</div>
              </div>
              <div className="row">
                <div className="left">PDF 리포트</div>
                <div className="right">워터마크 제거</div>
              </div>
              <div className="row">
                <div className="left">저장 히스토리</div>
                <div className="right">최대 500개</div>
              </div>
              <div className="row">
                <div className="left">부정 키워드</div>
                <div className="right">TOP 10</div>
              </div>
              <div className="row">
                <div className="left">긴급 대응 리뷰</div>
                <div className="right">TOP 10</div>
              </div>
              <div className="row">
                <div className="left">우선순위 매트릭스</div>
                <div className="right">상세 요약 포함</div>
              </div>
              <div className="row">
                <div className="left">분석 정밀도</div>
                <div className="right">정밀 분석 (리뷰 180건)</div>
              </div>
              <div className="row">
                <div className="left">공유 링크</div>
                <div className="right">가능</div>
              </div>
              <div className="row">
                <div className="left">지원</div>
                <div className="right">우선 이메일</div>
              </div>
            </div>
          </div>
          <footer className="pricingCardFooter">
            <div className="pricingCardActionRow">
              <PricingActions plan="basic" priceId={basicPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
            </div>
          </footer>
        </article>

        <article className="card pricingCard">
          <header className="pricingCardHeader">
            <div>
              <p className="pricingPlanLabel">Scale</p>
              <h2>Pro</h2>
            </div>
            <p className="pricingValue">₩89,000</p>
            <p className="muted pricingPlanMeta">월 89,000원 (팀/에이전시용)</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row">
                <div className="left">분석 횟수</div>
                <div className="right">월 1,000회</div>
              </div>
              <div className="row">
                <div className="left">1회 분석당 리뷰 수</div>
                <div className="right">최대 2,000개</div>
              </div>
              <div className="row">
                <div className="left">PDF 리포트</div>
                <div className="right">워터마크 제거 + 브랜드 로고</div>
              </div>
              <div className="row">
                <div className="left">저장 히스토리</div>
                <div className="right">최대 1,500개</div>
              </div>
              <div className="row">
                <div className="left">부정 키워드</div>
                <div className="right">TOP 10</div>
              </div>
              <div className="row">
                <div className="left">긴급 대응 리뷰</div>
                <div className="right">TOP 10</div>
              </div>
              <div className="row">
                <div className="left">우선순위 매트릭스</div>
                <div className="right">상세 요약 포함</div>
              </div>
              <div className="row">
                <div className="left">별점 시뮬레이션</div>
                <div className="right">가능</div>
              </div>
              <div className="row">
                <div className="left">긍정 키워드</div>
                <div className="right">가능</div>
              </div>
              <div className="row">
                <div className="left">개선 액션 체크리스트</div>
                <div className="right">전체</div>
              </div>
              <div className="row">
                <div className="left">분석 정밀도</div>
                <div className="right">최고 정밀도 (대량 우선 처리)</div>
              </div>
              <div className="row">
                <div className="left">팀원 좌석</div>
                <div className="right">최대 5명</div>
              </div>
              <div className="row">
                <div className="left">팀 공유</div>
                <div className="right">포함 (공동 운영 권장)</div>
              </div>
              <div className="row">
                <div className="left">지원</div>
                <div className="right">최우선 지원</div>
              </div>
            </div>
          </div>
          <footer className="pricingCardFooter">
            <div className="pricingCardActionRow">
              <PricingActions plan="pro" priceId={proPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
            </div>
          </footer>
        </article>
      </div>

      <section className="card pricingNoteCard">
        <div>
          <p className="sectionEyebrow">Note</p>
          <h2>대용량 업로드 시 일부 리뷰를 샘플링하여 분석할 수 있습니다.</h2>
          <p className="muted">안정적인 분석을 위해 대량 리뷰는 플랜별 최대 처리량에 맞춰 샘플링됩니다.</p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            지금 분석하기
          </a>
        </div>
      </section>
    </main>
  );
}
