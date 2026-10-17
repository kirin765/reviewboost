import React from "react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { extensionProduct } from "@/lib/extension-content";
import ExtensionInstallLink from "./ExtensionInstallLink";

export default function ExtensionPlans({ placement }: { placement: string }) {
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card flex flex-col gap-5 p-6 md:p-8">
          <div>
            <h3 className="text-balance text-xl font-semibold">무료 수집</h3>
            <p className="mt-3 text-4xl font-semibold tabular-nums">0원</p>
            <p className="mt-3 text-pretty leading-7 text-[var(--rb-muted-strong)]">먼저 내 상품에서 수집과 다운로드를 확인하세요.</p>
          </div>
          <ul className="flex-1 list-disc space-y-3 pl-5 leading-7">
            <li>하루 {extensionProduct.freeDailyLimit}개 리뷰 수집</li>
            <li>12개 쇼핑몰 · 엑셀·CSV 다운로드</li>
            <li>회원가입 없이 수집 시작</li>
          </ul>
          <ExtensionInstallLink placement={`${placement}_free`} />
        </section>
        <section className="card flex flex-col gap-5 border-[var(--rb-accent)] p-6 md:p-8">
          <div>
            <h3 className="text-balance text-xl font-semibold">Extension</h3>
            <p className="mt-3 text-4xl font-semibold tabular-nums">{extensionProduct.monthlyPrice.toLocaleString("ko-KR")}원 <span className="text-base font-normal text-[var(--rb-muted-strong)]">/ 월</span></p>
            <p className="mt-3 text-pretty leading-7 text-[var(--rb-muted-strong)]">리뷰를 자주 정리하거나 더 많은 리뷰가 필요할 때.</p>
          </div>
          <ul className="flex-1 list-disc space-y-3 pl-5 leading-7">
            <li>일일 수집 한도 없음</li>
            <li>한 번에 최대 {extensionProduct.perCollectionLimit.toLocaleString("ko-KR")}개 수집</li>
            <li>같은 엑셀·CSV 내보내기, 더 넉넉한 수집량</li>
          </ul>
          <Link href="/extension-connect?checkout=1" className={buttonStyles({ variant: "primary" })}>월 4,900원으로 시작</Link>
          <p className="text-pretty text-sm leading-6 text-[var(--rb-muted-strong)]">월 자동 갱신 구독입니다. 결제 후 같은 이메일로 로그인해 확장 프로그램을 연결하세요.</p>
        </section>
      </div>
      <p className="mt-5 text-pretty text-sm leading-7 text-[var(--rb-muted-strong)]">모든 플랜에서 1회 최대 2,000개까지 수집합니다. 실제 수집량은 공개 리뷰와 쇼핑몰의 접근 제한에 따라 달라집니다. AI 분석 한도는 별도이며, Basic·Pro에는 Extension 플랜이 포함됩니다.</p>
    </div>
  );
}
