import type { ClassifiedReview, Suggestions, ActionItem, Category } from './types';

/**
 * Generate actionable items based on classified reviews and suggestions.
 *
 * Creates concrete action items that can be taken to improve the business.
 */
export function generateActionItems(
  classified: ClassifiedReview[],
  suggestions: Suggestions
): ActionItem[] {
  const items: ActionItem[] = [];

  // Group negative reviews by category to find high-impact actions
  const categoryCounts = new Map<Category, number>();
  const categoryKeywords = new Map<Category, string[]>();

  for (const review of classified) {
    if (review.sentiment === 'negative') {
      const current = categoryCounts.get(review.category) ?? 0;
      categoryCounts.set(review.category, current + 1);

      // Extract simple keywords from text (first few words)
      const words = review.text.split(/[\s,.]/).slice(0, 5);
      const existing = categoryKeywords.get(review.category) ?? [];
      for (const word of words) {
        if (word.length > 2 && !existing.includes(word)) {
          existing.push(word);
        }
      }
      categoryKeywords.set(review.category, existing);
    }
  }

  // Create action items based on category frequency and suggestions
  const categories: Category[] = ['배송', '품질', '가격', '사용성', 'CS', '기타'];

  for (const category of categories) {
    const count = categoryCounts.get(category) ?? 0;
    if (count === 0) continue;

    // Determine impact based on count
    const impact: 'high' | 'medium' | 'low' = count > 10 ? 'high' : count > 5 ? 'medium' : 'low';

    // Find related suggestions for this category
    const relatedSuggestions = findRelatedSuggestions(suggestions, category);

    // Determine which type of action is most relevant
    const categoryActionType = getCategoryActionType(category);

    // Get related keywords
    const keywords = categoryKeywords.get(category) ?? [];

    items.push({
      id: `action-${category}`,
      action: generateActionText(category, count),
      relatedKeyword: keywords.slice(0, 3).join(', '),
      reviewCount: count,
      impact,
      category: categoryActionType,
    });
  }

  // Sort by impact (high first), then by review count
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return b.reviewCount - a.reviewCount;
  });

  return items;
}

function findRelatedSuggestions(suggestions: Suggestions, category: Category): string[] {
  const all = [
    ...suggestions.detailPageCopy,
    ...suggestions.csResponseTemplates,
    ...suggestions.faqRecommendations,
  ];

  // Simple keyword matching to find related suggestions
  const categoryKeywords: Record<Category, string[]> = {
    '배송': ['배송', '택배', '도착'],
    '품질': ['품질', '제품', '불량'],
    '가격': ['가격', '값', '저렴', '비싸'],
    '사용성': ['사용', '조립', '설치'],
    'CS': ['CS', '응대', '고객', '답변'],
    '기타': [],
  };

  const keywords = categoryKeywords[category] ?? [];
  return all.filter((s) => keywords.some((k) => s.includes(k)));
}

function getCategoryActionType(category: Category): 'detailPage' | 'csResponse' | 'faq' {
  switch (category) {
    case '품질':
    case '가격':
      return 'detailPage';
    case 'CS':
      return 'csResponse';
    case '배송':
    case '사용성':
      return 'faq';
    default:
      return 'detailPage';
  }
}

function generateActionText(category: Category, count: number): string {
  const templates: Record<Category, string> = {
    '배송': `배송 관련 ${count}건의 부정 리뷰 분석 필요 - 배송 PROCESS 개선`,
    '품질': `품질 관련 ${count}건의 부정 리뷰 분석 필요 - 품질 관리 강화`,
    '가격': `가격 관련 ${count}건의 부정 리뷰 분석 필요 - 가격 전략 재검토`,
    '사용성': `사용성 관련 ${count}건의 부정 리뷰 분석 필요 - 사용설명서 개선`,
    'CS': `CS 관련 ${count}건의 부정 리뷰 분석 필요 - 응대 TRAINING 강화`,
    '기타': `${count}건의 부정 리뷰 분석 필요 - 세부 원인 파악`,
  };
  return templates[category] ?? `${count}건의 부정 리뷰에 대한 개선 필요`;
}
