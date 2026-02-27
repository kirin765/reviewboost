import { useCallback, useState } from "react";

export type ReviewListItem = {
  id: string;
  title: string;
};

export type UseReviewsResult<TItem extends ReviewListItem> = {
  reviews: TItem[];
  loading: boolean;
  error: string | null;
  refresh: (query?: string) => Promise<void>;
  append: (item: TItem) => void;
};

export type ReviewsFetcher<TItem extends ReviewListItem> = (query: string) => Promise<TItem[]>;

export function useReviews<TItem extends ReviewListItem>(initial: TItem[] = [], fetcher?: ReviewsFetcher<TItem>) {
  const [reviews, setReviews] = useState<TItem[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (query?: string) => {
      if (!fetcher) return;
      try {
        setLoading(true);
        setError(null);
        const next = await fetcher(query ?? "");
        setReviews(next);
      } catch (err: unknown) {
        setError(String(err instanceof Error ? err.message : "리스트 조회 실패"));
      } finally {
        setLoading(false);
      }
    },
    [fetcher]
  );

  return {
    reviews,
    loading,
    error,
    refresh: refresh,
    append: (item: TItem) => setReviews((prev) => [...prev, item])
  } satisfies UseReviewsResult<TItem>;
}
