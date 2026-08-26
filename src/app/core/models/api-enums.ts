/**
 * Every closed set the backend can put on the wire.
 *
 * The API registers a JsonStringEnumConverter, so these arrive as the C# member
 * name verbatim — `"Primary"`, not `0` and not `"primary"`. Each union below is
 * the backend enum's members in the backend's own spelling. Renaming one to
 * something that reads better in English breaks the comparison silently, because
 * a string union has no runtime existence to fail on.
 *
 * Verified against StoneCraft-B @ 58251cb.
 */

/**
 * StoneCraft.Domain.Recommendations.RecommendationTier.
 *
 * `Caution` is a real fourth member of the backend enum and is included for that
 * reason alone. The tiers a *recommendation* carries are Primary/Secondary/
 * Supportive; `Caution` is what the entries in `cautions[]` carry. Omitting it
 * would make the cautioned list untypeable.
 */
export type RecommendationTier = 'Primary' | 'Secondary' | 'Supportive' | 'Caution';

/**
 * StoneCraft.Domain.Recommendations.ConfidenceBand.
 *
 * These names are bibliographic — they describe how firmly a *source* stated
 * something, not how likely it is to be true. The display copy has to carry that
 * distinction; the value must not.
 */
export type ConfidenceBand = 'WellAttested' | 'Qualified' | 'HeavilyHedged';

/** StoneCraft.Domain.Recommendations.UnavailabilityReason. */
export type UnavailabilityReason =
  | 'BirthTimeUnknown'
  | 'DignityInconsistentInSource'
  | 'TraditionDataUnavailable'
  | 'RulePendingHumanConfirmation'
  /**
   * Every stone the rule names has been withdrawn from the catalogue, so it has
   * nothing left to act on.
   *
   * **Not a gap in this reading, and the two must not be shown the same way.**
   * The others say something about *this chart* — no birth time, a source that
   * contradicts itself — and a person can sometimes act on them. This one is a
   * permanent property of the shop's catalogue: it arrives on every reading, is
   * identical every time, and tells the person nothing about themselves.
   *
   * It stays in the response because the API must not lie about which rules
   * fired, and `RulePendingHumanConfirmation` would be a different and false
   * statement. What it must not do is take a line on the screen.
   */
  | 'MaterialWithdrawn';

/**
 * StoneCraft.Domain.Astrology.BirthDataTier.
 *
 * Gates which facts exist at all. A `Located` reading has no houses and no chart
 * ruler — not because they were dropped, but because they were never computed.
 */
export type BirthDataTier = 'Unknown' | 'DateOnly' | 'Located' | 'Full';

/** StoneCraft.Domain.Astrology.Dignity. `Unknown` is not a synonym for `Neutral`. */
export type Dignity = 'Own' | 'Exalted' | 'Neutral' | 'Detriment' | 'Fall' | 'Unknown';

/** StoneCraft.Domain.Materials.SafetyClass. */
export type SafetyClass = 'Safe' | 'HandlingCaution' | 'NotForSkinContact' | 'Toxic' | 'Excluded';

/** StoneCraft.Domain.Bracelets.BeadGrade. */
export type BeadGrade = 'Standard' | 'Premium';

/** StoneCraft.Domain.Bracelets.SlotLock. */
export type SlotLock = 'None' | 'TemplateMandated';

/** StoneCraft.Application.Features.Bracelets.RevalidateBracelet.BraceletChangeKind. */
export type BraceletChangeKind =
  'SafetyReclassified' | 'MaterialDeactivated' | 'BeadDelisted' | 'BeadRemoved';

/** StoneCraft.Domain.Astrology.RulershipScheme. */
export type RulershipScheme = 'Traditional' | 'Modern' | 'HickeyPrimary';

/**
 * StoneCraft.Domain.Astrology.DoctrineState — how firmly a source stated a dignity.
 *
 * The same how-well-attested axis that `ConfidenceBand` carries for recommendations. A
 * `StatedButHedged` dignity is usable but weaker evidence, and showing the dignity without the
 * state states a hedged claim plainly.
 */
export type DoctrineState = 'Stated' | 'StatedButHedged' | 'StatedInconsistent' | 'NotStated';
