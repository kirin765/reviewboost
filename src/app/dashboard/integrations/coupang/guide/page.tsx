import type { Metadata } from "next";
import Image from "next/image";
import { Eyebrow, Panel, primaryButtonClass, secondaryButtonClass } from "@/components/marketing/MarketingPrimitives";

export const metadata: Metadata = {
  title: "쿠팡 OpenAPI Key 발급 가이드 - ReviewBoost",
  description: "쿠팡 Wing에서 자체개발 방식으로 OpenAPI access key, secret key를 발급받는 절차와 ReviewBoost 입력값을 안내합니다."
};

const steps = [
  {
    title: "Wing에서 판매자 정보로 이동",
    body: "쿠팡 공식 문서에 따라 WING 로그인 후 우측 상단 아이디 메뉴에서 판매자정보 또는 추가판매정보로 이동합니다."
  },
  {
    title: "API Key 발급받기 선택",
    body: "하단의 API Key 발급받기 버튼을 누르고, 팝업에서 OPEN API를 선택한 뒤 약관 동의 후 발급 절차를 시작합니다."
  },
  {
    title: "업체 입력 방식은 자체개발",
    body: "연동업체가 아니라 자체개발(직접입력)을 선택해야 합니다. 이 단계에서 업체명, URL, IP 주소를 직접 입력합니다."
  },
  {
    title: "발급된 키를 ReviewBoost에 저장",
    body: "발급이 완료되면 Access Key, Secret Key가 표시됩니다. 해당 값을 ReviewBoost 쿠팡 연동 설정 페이지에 저장하면 됩니다."
  }
];

const reviewBoostFields = [
  ["업체명", "reviewboost.co.kr"],
  ["URL", "reviewboost.co.kr"],
  ["IP 주소", "216.198.79.1"]
];

export default function CoupangIntegrationGuidePage() {
  return (
    <main className="pb-16">
      <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div className="max-w-[700px]">
          <Eyebrow>Coupang Guide</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.96]">
            쿠팡 Wing에서
            <br />
            자체개발로 OpenAPI Key를
            <br />
            발급받는 방법
          </h1>
          <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
            ReviewBoost 연동에 필요한 `accessKey`, `secretKey`, `vendorId`는 쿠팡 Wing에서 직접 발급받아야 합니다. 아래 안내는 쿠팡 공식 문서
            <a className="ml-1 underline decoration-white/20 underline-offset-4 hover:text-white" href="https://developers.coupangcorp.com/hc/ko/articles/20288952179993-OpenAPI-Key-%EB%B0%9C%EA%B8%89%EB%B0%9B%EA%B8%B0" target="_blank" rel="noreferrer">
              OpenAPI Key 발급받기
            </a>
            를 기준으로 정리했습니다.
          </p>
        </div>

        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Step {index + 1}</div>
                <div className="mt-3 text-base font-medium text-white">{step.title}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{step.body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-6 md:p-7">
          <Eyebrow>Input Values</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">자체개발 선택 후 이렇게 입력하세요</h2>
          <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">
            쿠팡 문서 기준으로 자체개발을 선택하면 업체명, URL, IP 주소를 입력해야 합니다. ReviewBoost 연동용 입력값은 아래와 같습니다.
          </p>

          <div className="mt-8 space-y-4">
            {reviewBoostFields.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-5 border-t border-white/[0.08] py-4 first:border-t-0 first:pt-0">
                <div className="text-sm text-white">{label}</div>
                <div className="text-right text-sm font-medium text-white">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[22px] border border-emerald-400/18 bg-emerald-400/[0.06] p-4 text-sm leading-7 text-emerald-100">
            `vendorId`는 access key / secret key 발급 후 별도로 확인해 ReviewBoost 설정 페이지에 입력해야 합니다. access key / secret key만으로 vendorId를 역산할 수는 없습니다.
          </div>
        </Panel>

        <Panel className="overflow-hidden p-4 md:p-5">
          <Image
            src="/coupang-guide/self-development-form.png"
            alt="쿠팡 Wing 자체개발 선택 후 업체명, URL, IP 주소를 입력하는 팝업 화면"
            width={1024}
            height={768}
            className="w-full rounded-[24px] border border-white/[0.08]"
          />
          <p className="px-2 pb-2 pt-4 text-sm leading-7 text-[var(--color-muted)]">
            쿠팡 공식 문서의 `2) 자체개발 선택 후 발급 화면` 이미지입니다. ReviewBoost 연동 시에는 위 팝업에서 자체개발(직접입력)을 선택한 뒤 아래 값으로 입력하면 됩니다.
          </p>
        </Panel>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <Panel className="overflow-hidden p-4 md:p-5">
          <Image
            src="/coupang-guide/reviewboost-self-development-values.png"
            alt="ReviewBoost 연동 정보 예시로 업체명 reviewboost.co.kr, IP 주소 216.198.79.1, URL reviewboost.co.kr가 표시된 화면"
            width={974}
            height={174}
            className="w-full rounded-[24px] border border-white/[0.08] bg-white"
          />
          <p className="px-2 pb-2 pt-4 text-sm leading-7 text-[var(--color-muted)]">
            ReviewBoost에서 안내하는 실제 입력값 예시입니다. 업체명과 URL은 `reviewboost.co.kr`, IP 주소는 `216.198.79.1`로 입력합니다.
          </p>
        </Panel>

        <Panel className="overflow-hidden p-4 md:p-5">
          <Image
            src="/coupang-guide/issued-key-screen.png"
            alt="쿠팡 Wing에서 Access Key와 Secret Key가 발급된 후 표시되는 화면"
            width={1000}
            height={750}
            className="w-full rounded-[24px] border border-white/[0.08]"
          />
          <p className="px-2 pb-2 pt-4 text-sm leading-7 text-[var(--color-muted)]">
            발급이 끝나면 위와 같이 Access Key와 Secret Key를 확인할 수 있습니다. 이 두 값과 vendorId를 ReviewBoost 쿠팡 연동 페이지에 저장하세요.
          </p>
        </Panel>
      </section>

      <section className="mt-16">
        <Panel className="p-6 md:p-7">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[720px]">
              <Eyebrow>Notes</Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">발급 전에 알아둘 점</h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--color-muted)]">
                <p>판매자 등록과 사업자 인증이 완료된 WING 계정에서만 OpenAPI Key 발급이 가능합니다.</p>
                <p>쿠팡 문서에 따르면 최초 발급 후 실제 접근 권한이 반영되기까지 24시간 이상 걸릴 수 있고, 연동 정보 수정이나 재발급은 최대 30분 내 반영될 수 있습니다.</p>
                <p>Access Key와 Secret Key는 외부에 노출하면 안 됩니다. ReviewBoost에는 로그인한 본인 계정으로만 저장하세요.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/dashboard/integrations/coupang" className={primaryButtonClass}>쿠팡 연동 설정으로 돌아가기</a>
              <a
                href="https://developers.coupangcorp.com/hc/ko/articles/20288952179993-OpenAPI-Key-%EB%B0%9C%EA%B8%89%EB%B0%9B%EA%B8%B0"
                target="_blank"
                rel="noreferrer"
                className={secondaryButtonClass}
              >
                쿠팡 공식 문서 열기
              </a>
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
