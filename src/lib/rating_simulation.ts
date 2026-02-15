import type { AnalysisStats, RatingSimulation, SimulationScenario } from './types';

/**
 * Simulate potential rating improvements if certain negative reviews are resolved.
 *
 * This provides realistic scenarios based on the actual data:
 * - If X% of negative reviews are resolved (e.g., CS contacted, refunds given)
 * - What would be the new average rating?
 */
export function simulateRatingImprovements(
  stats: AnalysisStats,
  negativeKeywords: Array<{ keyword: string; count: number }>
): RatingSimulation {
  const currentAvg = stats.avgRating ?? 0;
  if (stats.total === 0 || stats.negative === 0) {
    return {
      currentAvg,
      scenarios: [],
    };
  }

  const scenarios: SimulationScenario[] = [];

  // Scenario 1: Resolve 25% of negative reviews (aggressive outreach)
  const scenario25 = calculateScenario(
    stats,
    negativeKeywords,
    0.25,
    '25% 해결 시'
  );
  scenarios.push(scenario25);

  // Scenario 2: Resolve 50% of negative reviews (major improvement)
  const scenario50 = calculateScenario(
    stats,
    negativeKeywords,
    0.50,
    '50% 해결 시'
  );
  scenarios.push(scenario50);

  // Scenario 3: Resolve 75% of negative reviews (exceptional)
  const scenario75 = calculateScenario(
    stats,
    negativeKeywords,
    0.75,
    '75% 해결 시'
  );
  scenarios.push(scenario75);

  // Scenario 4: If all negative reviews become positive (ideal)
  const scenarioAll = calculateScenario(
    stats,
    negativeKeywords,
    1.0,
    '전체 해결 시 (이상적)'
  );
  scenarios.push(scenarioAll);

  return {
    currentAvg,
    scenarios,
  };
}

function calculateScenario(
  stats: AnalysisStats,
  negativeKeywords: Array<{ keyword: string; count: number }>,
  resolveRatio: number,
  label: string
): SimulationScenario {
  const total = stats.total;
  const negative = stats.negative;
  const currentAvg = stats.avgRating ?? 0;

  // Number of negative reviews that would be resolved
  const resolvedCount = Math.round(negative * resolveRatio);

  // Assuming resolved negative reviews become 5-star
  const currentTotalPoints = currentAvg * total;
  const pointsGained = resolvedCount * 5; // 0 -> 5 star improvement for resolved
  const newTotalPoints = currentTotalPoints + pointsGained;
  const newTotal = total; // count stays the same

  const newAvg = newTotal > 0 ? newTotalPoints / newTotal : 0;
  const delta = newAvg - currentAvg;

  // Get top keywords from the resolved portion (approximation)
  const topKeywords = negativeKeywords
    .slice(0, 3)
    .map((k) => k.keyword);

  return {
    label,
    resolvedCount,
    newAvg: Math.round(newAvg * 100) / 100,
    delta: Math.round(delta * 100) / 100,
    relatedKeywords: topKeywords,
  };
}
