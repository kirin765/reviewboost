import type { Category, ClassifiedReview, AnalysisStats, PriorityMatrixItem } from './types';

/**
 * Impact scores for each category (1-10 scale)
 * Based on typical customer behavior and business impact
 */
const CATEGORY_IMPACT: Record<Category, number> = {
  '배송': 7,
  '품질': 9,
  '가격': 6,
  '사용성': 7,
  'CS': 8,
  '기타': 4,
};

const CATEGORY_ACTION_SUMMARY: Record<Category, string> = {
  '배송': '배송 PROCESS 개선 필요',
  '품질': '품질 관리 강화',
  '가격': '가격 경쟁력 확보',
  '사용성': '사용성 개선 필요',
  'CS': 'CS 응대 체계 구축',
  '기타': '세부 분석 필요',
};

/**
 * Calculate priority matrix based on frequency and impact.
 *
 * Quadrants:
 * - critical: High frequency + High impact
 * - monitor: Low frequency + High impact
 * - review: High frequency + Low impact
 * - observe: Low frequency + Low impact
 */
export function calculatePriorityMatrix(
  classified: ClassifiedReview[],
  stats: AnalysisStats
): PriorityMatrixItem[] {
  const total = stats.total;
  if (total === 0) return [];

  const categories: Category[] = ['배송', '품질', '가격', '사용성', 'CS', '기타'];
  const matrix: PriorityMatrixItem[] = [];

  // Calculate frequency and impact for each category
  for (const category of categories) {
    const count = stats.categoryCounts[category] ?? 0;
    const frequency = count;
    const frequencyPct = total > 0 ? (count / total) * 100 : 0;
    const impact = CATEGORY_IMPACT[category];

    // Determine quadrant based on median values
    // Using 5% as median frequency threshold (arbitrary but reasonable)
    const freqThreshold = 5;
    const quadrant = getQuadrant(frequencyPct, impact, freqThreshold);

    matrix.push({
      category,
      frequency,
      frequencyPct: Math.round(frequencyPct * 10) / 10,
      impact,
      quadrant,
      actionSummary: CATEGORY_ACTION_SUMMARY[category],
    });
  }

  // Sort by quadrant priority: critical > monitor > review > observe
  const quadrantOrder: Record<string, number> = {
    critical: 0,
    monitor: 1,
    review: 2,
    observe: 3,
  };

  matrix.sort((a, b) => quadrantOrder[a.quadrant] - quadrantOrder[b.quadrant]);

  return matrix;
}

function getQuadrant(frequencyPct: number, impact: number, freqThreshold: number): 'critical' | 'monitor' | 'review' | 'observe' {
  const highFreq = frequencyPct >= freqThreshold;
  const highImpact = impact >= 7;

  if (highFreq && highImpact) return 'critical';
  if (!highFreq && highImpact) return 'monitor';
  if (highFreq && !highImpact) return 'review';
  return 'observe';
}
