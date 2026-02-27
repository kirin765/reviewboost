import { useMemo, useState } from "react";

export type UsePaginationArgs = {
  initialPage?: number;
  initialPageSize?: number;
};

export function usePagination<T>(items: T[], args?: UsePaginationArgs) {
  const pageSize = args?.initialPageSize && args.initialPageSize > 0 ? args.initialPageSize : 10;
  const [page, setPage] = useState(args?.initialPage ?? 1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  return {
    page: currentPage,
    totalPages,
    pageSize,
    visibleItems,
    nextPage: () => setPage((prev) => Math.min(totalPages, prev + 1)),
    prevPage: () => setPage((prev) => Math.max(1, prev - 1)),
    setPage,
    reset: () => setPage(1)
  };
}

