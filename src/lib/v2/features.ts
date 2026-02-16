/**
 * V2 Features barrel export
 *
 * This module consolidates all V2 analysis features for easier imports.
 * V2 features include:
 * - Urgent reviews (negative reviews needing immediate attention)
 * - Priority matrix (category-based prioritization)
 * - Rating simulation (what-if analysis for improving ratings)
 * - Action items (recommended actions based on analysis)
 * - Positive keyword extraction
 *
 * Usage:
 * import { extractUrgentReviews, calculatePriorityMatrix } from "@/lib/v2/features";
 */

export { extractUrgentReviews } from "@/lib/urgent_reviews";
export { calculatePriorityMatrix } from "@/lib/priority_matrix";
export { simulateRatingImprovements } from "@/lib/rating_simulation";
export { generateActionItems } from "@/lib/action_items";
export { topKeywords, extractPositiveKeywords } from "@/lib/keywords";
