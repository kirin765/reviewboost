import type { ClassifiedReview, UrgentReview } from './types';

/**
 * Extract urgent reviews that need immediate attention.
 *
 * Criteria:
 * - Rating 1-2 stars
 * - Negative sentiment
 * - Prioritize reviews from last 7 days
 * - Maximum 10 reviews returned
 */
export function extractUrgentReviews(classified: ClassifiedReview[]): UrgentReview[] {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter for negative reviews with low rating
  const negativeLowRating = classified.filter((r) => {
    const rating = r.rating;
    return rating !== null && rating <= 2 && r.sentiment === 'negative';
  });

  // Calculate days since written and prioritize recent ones
  const withDays = negativeLowRating.map((review) => {
    let daysSinceWritten: number | null = null;
    if (review.reviewedAt) {
      try {
        const reviewDate = new Date(review.reviewedAt);
        if (!isNaN(reviewDate.getTime())) {
          const diffTime = now.getTime() - reviewDate.getTime();
          daysSinceWritten = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      } catch {
        // ignore parse errors
      }
    }
    return { review, daysSinceWritten };
  });

  // Sort: recent reviews first (null days at end), then by rating (1 star first)
  withDays.sort((a, b) => {
    // Both have dates: compare by recency
    if (a.daysSinceWritten !== null && b.daysSinceWritten !== null) {
      if (a.daysSinceWritten !== b.daysSinceWritten) {
        return a.daysSinceWritten - b.daysSinceWritten; // smaller = more recent
      }
    }
    // One has date, other doesn't: prioritize one with date
    if (a.daysSinceWritten !== null && b.daysSinceWritten === null) return -1;
    if (a.daysSinceWritten === null && b.daysSinceWritten !== null) return 1;

    // Same recency: sort by rating (lower first)
    const ratingA = a.review.rating ?? 5;
    const ratingB = b.review.rating ?? 5;
    return ratingA - ratingB;
  });

  // Take top 10
  const urgent = withDays.slice(0, 10);

  // Generate highlighted text (first 100 chars with emphasis on issue-related words)
  return urgent.map(({ review, daysSinceWritten }) => {
    const text = review.text;
    const highlightedText = text.length > 100 ? text.slice(0, 100) + '...' : text;

    return {
      review,
      highlightedText,
      daysSinceWritten,
    };
  });
}
