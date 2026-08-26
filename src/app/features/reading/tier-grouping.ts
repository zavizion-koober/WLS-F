import type { RecommendationTier } from '@core/models/api-enums';
import type {
  CustomerRecommendation,
  CustomerUnavailableGroup,
  SharedRecommendation,
} from '@core/models/gemstones.models';

/**
 * Grouping the ranked list by tier, in the backend's order.
 *
 * The order is `Primary`, `Secondary`, `Supportive` — the backend's own words
 * and its own sequence, not "Primary / Supporting / Optional" and not sorted
 * alphabetically. Tier is a claim the rulepack makes about strength of
 * association; re-ordering or re-labelling it here would be the frontend
 * quietly restating the backend's finding as something else.
 *
 * `Caution` is not one of the display groups. It is the tier carried by entries
 * in the response's separate `cautions[]` list, which is presented as counsel
 * rather than as a fourth rank, so it is excluded here and rendered by its own
 * section.
 */
export const DISPLAY_TIERS = ['Primary', 'Secondary', 'Supportive'] as const;

export type DisplayTier = (typeof DISPLAY_TIERS)[number];

export interface TierGroup<T> {
  readonly tier: DisplayTier;
  readonly items: readonly T[];
}

/**
 * Groups by tier, preserving the backend's ordering within each group.
 *
 * The backend already ranked these by score; re-sorting would discard a ranking
 * computed from evidence in favour of one computed from a number the UI happens
 * to have. Empty groups are dropped — a reading with no Supportive stones should
 * show no Supportive heading, not an empty one.
 */
export function groupByTier<T extends { tier: RecommendationTier }>(
  recommendations: readonly T[],
): readonly TierGroup<T>[] {
  return DISPLAY_TIERS.map((tier) => ({
    tier,
    items: recommendations.filter((r) => r.tier === tier),
  })).filter((group) => group.items.length > 0);
}

/**
 * A stone the corpus both recommends and warns about must never be rendered
 * without its warning attached. This is the predicate that decides it, in one
 * place, so a card cannot forget.
 */
export function requiresCautionNotice(
  recommendation: CustomerRecommendation | SharedRecommendation,
): boolean {
  return recommendation.isCautioned;
}

/** The caution reason keys, whichever projection the recommendation came from. */
export function cautionReasonKeys(
  recommendation: CustomerRecommendation | SharedRecommendation,
): readonly string[] {
  if ('cautions' in recommendation) {
    return recommendation.cautions.map((c) => c.reasonKey);
  }
  return recommendation.cautionReasonKeys;
}

/**
 * The unavailability reasons worth showing a person.
 *
 * `MaterialWithdrawn` is excluded, and it is the only one. It says a rule is
 * asleep because every stone it names has been withdrawn from the catalogue —
 * Pavitt's caution against opal, since D23 — which is true, permanent, identical
 * on every reading, and about the shop rather than about the person reading it.
 *
 * <b>Filtered at the display and not at the source.</b> The response still
 * carries it, because the API must not misreport which rules fired and because a
 * reviewer needs to see that a documented rule exists and why it never fires.
 * That is D22's shape: the data keeps everything, the screen decides. Removing it
 * from the response instead would be a deletion made for a display reason, which
 * is what D16 rules out.
 */
export function shownToAPerson(
  groups: readonly CustomerUnavailableGroup[],
): readonly CustomerUnavailableGroup[] {
  return groups.filter((group) => group.reason !== 'MaterialWithdrawn');
}
