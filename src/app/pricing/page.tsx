import React from "react";
import PricingActions from "@/components/PricingActions";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { paddlePriceIdForPlan } from "@/lib/paddle";

export default async function PricingPage({
  searchParams
}: {
  searchParams?: { billing?: string; [key: string]: string | string[] | undefined };
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
    const supabase = createSupabaseServerComponentClient();
    const result = await supabase.auth.getUser();
    userId = result?.data?.user?.id ?? null;
    userEmail = result?.data?.user?.email ?? null;
  } catch {
    // ignore and keep unauthenticated state
  }

  const basicPriceId = safePlanPriceId("basic");
  const proPriceId = safePlanPriceId("pro");
  const billing = searchParams?.billing;
  return (
    <main className="pageMain">
      <div className="card">
        <h2>요금제 (MVP)</h2>
        <p className="muted">현재는 MVP 단계이며, 아래 구성/가격은 운영 데이터에 따라 조정될 수 있습니다.</p>
        {billing === "success" ? <p className="hint">결제가 완료되었습니다. 구독 상태 반영까지 최대 1분 정도 소요될 수 있습니다.</p> : null}
        {billing === "cancel" ? <p className="hint">결제가 취소되었습니다. 다시 시도하실 수 있습니다.</p> : null}
      </div>

      <div className="pricingCardGrid">
        <div className="card">
          <h2>무료</h2>
          <p className="muted">체험/초기 유입용 (베타 기간)</p>
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

        <div className="card" style={{ borderColor: "var(--color-primary)", position: "relative" }}>
          <span className="badge badgePrimary" style={{ position: 'absolute', top: -10, right: 16 }}>추천</span>
          <h2>Basic</h2>
          <p className="muted">월 39,000원 (1인 실사용 추천, 초기 검증 가격)</p>
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
          <PricingActions
            plan="basic"
            priceId={basicPriceId}
            userId={userId ?? undefined}
            userEmail={userEmail ?? undefined}
          />
        </div>

        <div className="card">
          <h2>Pro</h2>
          <p className="muted">월 89,000원 (팀/에이전시용)</p>
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
          <PricingActions
            plan="pro"
            priceId={proPriceId}
            userId={userId ?? undefined}
            userEmail={userEmail ?? undefined}
          />
        </div>
      </div>

      <div className="card">
        <h2>안내</h2>
        <p className="muted">Basic 가격은 초기 검증 구간(39,000원)이며 운영 지표에 따라 49,000원으로 조정될 수 있습니다.</p>
        <p className="muted">대용량 업로드 시 안정성을 위해 일부 리뷰를 샘플링하여 분석할 수 있습니다.</p>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            지금 분석하기
          </a>
        </div>
      </div>
    </main>
  );
}
