"use client";

import { useCallback, useState } from "react";
import { getErrorMessage } from "@/types/common";
import { getCoupangSellerProducts, type CoupangSellerProduct, type CoupangSellerProductsQuery } from "@/lib/api/coupang";
import { Eyebrow, Panel, primaryButtonClass, secondaryButtonClass } from "@/components/marketing/MarketingPrimitives";

const statusOptions = [
  { value: "", label: "전체 상태" },
  { value: "IN_REVIEW", label: "심사중" },
  { value: "SAVED", label: "임시저장" },
  { value: "APPROVING", label: "승인대기" },
  { value: "APPROVED", label: "승인완료" },
  { value: "PARTIAL_APPROVED", label: "부분승인" },
  { value: "DENIED", label: "승인반려" },
  { value: "DELETED", label: "삭제" }
] as const;

type Filters = {
  sellerProductName: string;
  status: string;
  createdAt: string;
  maxPerPage: string;
  nextToken: string;
};

const initialFilters: Filters = {
  sellerProductName: "",
  status: "",
  createdAt: "",
  maxPerPage: "10",
  nextToken: ""
};

function toQuery(filters: Filters): CoupangSellerProductsQuery {
  return {
    sellerProductName: filters.sellerProductName.trim() || undefined,
    status: (filters.status || undefined) as CoupangSellerProductsQuery["status"],
    createdAt: filters.createdAt || undefined,
    maxPerPage: Number.parseInt(filters.maxPerPage, 10) || 10,
    nextToken: filters.nextToken.trim() || undefined
  };
}

function ProductRow({ product }: { product: CoupangSellerProduct }) {
  return (
    <tr className="border-t border-white/[0.08] align-top">
      <td className="px-4 py-3 text-sm text-white">{product.sellerProductId}</td>
      <td className="px-4 py-3 text-sm text-white">{product.sellerProductName}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-muted)]">{product.statusName || "-"}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-muted)]">{product.brand || "-"}</td>
      <td className="px-4 py-3 text-sm text-[var(--color-muted)]">{product.createdAt || "-"}</td>
    </tr>
  );
}

export default function CoupangSellerProductListTool() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CoupangSellerProduct[]>([]);
  const [nextToken, setNextToken] = useState("");
  const [lastQuery, setLastQuery] = useState<CoupangSellerProductsQuery | null>(null);

  const updateFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const fetchProducts = useCallback(async (query: CoupangSellerProductsQuery) => {
    setBusy(true);
    setError(null);
    try {
      const result = await getCoupangSellerProducts(query);
      setProducts(result.data);
      setNextToken(result.nextToken);
      setLastQuery(query);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const onSearch = useCallback(async () => {
    await fetchProducts(toQuery({ ...filters, nextToken: "" }));
  }, [fetchProducts, filters]);

  const onNextPage = useCallback(async () => {
    if (!nextToken) return;
    const query = { ...(lastQuery ?? toQuery(filters)), nextToken };
    await fetchProducts(query);
    setFilters((current) => ({ ...current, nextToken }));
  }, [fetchProducts, filters, lastQuery, nextToken]);

  return (
    <section className="mx-auto mt-20 max-w-[1240px] px-5 pb-24 md:px-8">
      <div className="max-w-[720px]">
        <Eyebrow>Seller Products</Eyebrow>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.98]">
          등록상품 목록을
          <br />
          쿠팡 Open API로
          <br />
          바로 조회합니다
        </h2>
        <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">
          쿠팡 문서의 `상품 목록 페이징 조회` 스펙에 맞춰 목록을 조회합니다. `vendorId`, `accessKey`, `secretKey`는 사용자 연동 페이지에 저장된 값을 서버에서 불러와 사용합니다.
        </p>
      </div>

      <Panel className="mt-10 p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
          <div>
            <div className="text-sm font-medium text-white">연동 정보 먼저 등록</div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">상품조회는 로그인한 사용자의 저장된 쿠팡 자격증명을 사용합니다.</div>
          </div>
          <a href="/dashboard/integrations/coupang" className={secondaryButtonClass}>쿠팡 연동 설정</a>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm text-white/72">상품명</span>
            <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" value={filters.sellerProductName} onChange={(event) => updateFilter("sellerProductName", event.target.value)} placeholder="20자 이하" disabled={busy} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/72">상태</span>
            <select className="h-12 rounded-[16px] border border-white/[0.08] bg-[#0f141b] px-4 text-white outline-none" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} disabled={busy}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/72">등록일</span>
            <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" type="date" value={filters.createdAt} onChange={(event) => updateFilter("createdAt", event.target.value)} disabled={busy} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/72">페이지당 건수</span>
            <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" type="number" min={1} max={100} value={filters.maxPerPage} onChange={(event) => updateFilter("maxPerPage", event.target.value)} disabled={busy} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-white/72">nextToken</span>
            <input className="h-12 rounded-[16px] border border-white/[0.08] bg-white/[0.03] px-4 text-white outline-none" value={filters.nextToken} onChange={(event) => updateFilter("nextToken", event.target.value)} placeholder="수동 페이지 조회 시 사용" disabled={busy} />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={`${primaryButtonClass} border-0`} onClick={onSearch} disabled={busy}>
            {busy ? "조회 중..." : "상품 목록 조회"}
          </button>
          <button type="button" className={secondaryButtonClass} onClick={onNextPage} disabled={busy || !nextToken}>
            다음 페이지
          </button>
        </div>

        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
          로그인된 사용자만 조회할 수 있도록 server route에서 세션을 확인합니다. 다음 페이지가 있으면 `nextToken`이 내려옵니다.
        </p>

        {error ? <p className="mt-5 text-sm text-red-400">{error}</p> : null}

        <div className="mt-8 rounded-[24px] border border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center justify-between px-4 py-4 text-sm text-white/72">
            <span>조회 결과 {products.length}건</span>
            <span>다음 토큰: {nextToken || "-"}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-t border-white/[0.08] text-left text-xs uppercase tracking-[0.18em] text-white/48">
                  <th className="px-4 py-3">상품 ID</th>
                  <th className="px-4 py-3">상품명</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3">브랜드</th>
                  <th className="px-4 py-3">등록일</th>
                </tr>
              </thead>
              <tbody>
                {products.length ? products.map((product) => <ProductRow key={product.sellerProductId} product={product} />) : null}
              </tbody>
            </table>
            {!products.length && !busy ? <div className="px-4 py-10 text-sm text-[var(--color-muted)]">조회 결과가 없습니다.</div> : null}
          </div>
        </div>
      </Panel>
    </section>
  );
}
