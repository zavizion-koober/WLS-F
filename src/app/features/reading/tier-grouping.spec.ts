import { describe, expect, it } from 'vitest';

import type { RecommendationTier } from '@core/models/api-enums';
import type {
  CustomerRecommendation,
  CustomerUnavailableGroup,
  SharedRecommendation,
} from '@core/models/gemstones.models';

import {
  cautionReasonKeys,
  DISPLAY_TIERS,
  groupByTier,
  requiresCautionNotice,
  shownToAPerson,
} from './tier-grouping';

const rec = (
  slug: string,
  tier: RecommendationTier,
): { tier: RecommendationTier; slug: string } => ({
  slug,
  tier,
});

describe('tier grouping', () => {
  it('uses the backend tier names, in the backend order', () => {
    expect(DISPLAY_TIERS).toEqual(['Primary', 'Secondary', 'Supportive']);
  });

  it('groups a mixed list into tiers, Primary first', () => {
    const groups = groupByTier([
      rec('amethyst', 'Supportive'),
      rec('emerald', 'Primary'),
      rec('carnelian', 'Secondary'),
      rec('jade', 'Primary'),
    ]);

    expect(groups.map((g) => g.tier)).toEqual(['Primary', 'Secondary', 'Supportive']);
    expect(groups[0].items.map((i) => i.slug)).toEqual(['emerald', 'jade']);
  });

  it('preserves the backend ordering inside a group', () => {
    // The backend ranked these by score against evidence. Re-sorting here would
    // replace that with an ordering the UI invented.
    const groups = groupByTier([rec('zircon', 'Primary'), rec('agate', 'Primary')]);
    expect(groups[0].items.map((i) => i.slug)).toEqual(['zircon', 'agate']);
  });

  it('drops empty groups rather than rendering an empty heading', () => {
    const groups = groupByTier([rec('emerald', 'Primary')]);
    expect(groups).toHaveLength(1);
    expect(groups.map((g) => g.tier)).toEqual(['Primary']);
  });

  it('excludes Caution from the display tiers', () => {
    // Caution is what entries in the separate cautions[] list carry. It is
    // counsel, presented in its own section — not a fourth rank below Supportive.
    const groups = groupByTier([rec('malachite', 'Caution'), rec('emerald', 'Primary')]);
    expect(groups.flatMap((g) => g.items.map((i) => i.slug))).toEqual(['emerald']);
  });

  it('returns nothing for an empty reading', () => {
    expect(groupByTier([])).toEqual([]);
  });
});

describe('caution notices', () => {
  const customer = {
    isCautioned: true,
    cautions: [{ reasonKey: 'reason.caution.toxic' }],
  } as unknown as CustomerRecommendation;

  const shared = {
    isCautioned: true,
    cautionReasonKeys: ['reason.caution.toxic'],
  } as unknown as SharedRecommendation;

  it('flags a cautioned stone regardless of projection', () => {
    expect(requiresCautionNotice(customer)).toBe(true);
    expect(requiresCautionNotice(shared)).toBe(true);
  });

  it('reads the caution keys out of either projection shape', () => {
    // The owner response carries objects; the shared response carries bare
    // strings. A card that assumed one shape would silently render no warning on
    // the other — on the more public of the two surfaces.
    expect(cautionReasonKeys(customer)).toEqual(['reason.caution.toxic']);
    expect(cautionReasonKeys(shared)).toEqual(['reason.caution.toxic']);
  });
});

/**
 * Which unavailability reasons a person actually sees.
 */
describe('shownToAPerson', () => {
  const group = (
    reason: CustomerUnavailableGroup['reason'],
    count = 1,
  ): CustomerUnavailableGroup => ({
    reason,
    count,
    reasonKey: `unavailable.${reason}`,
  });

  it('keeps the reasons that say something about this chart', () => {
    const kept = shownToAPerson([
      group('BirthTimeUnknown', 6),
      group('DignityInconsistentInSource', 2),
      group('TraditionDataUnavailable'),
      group('RulePendingHumanConfirmation', 12),
    ]);

    expect(kept.map((g) => g.reason)).toEqual([
      'BirthTimeUnknown',
      'DignityInconsistentInSource',
      'TraditionDataUnavailable',
      'RulePendingHumanConfirmation',
    ]);
  });

  /**
   * `MaterialWithdrawn` arrives on every single reading, says the same thing
   * every time, and is about the shop's catalogue rather than about the person
   * reading it — Pavitt's caution against opal, asleep since the stone was
   * withdrawn at D23. Every other reason can, at least sometimes, be acted on.
   */
  it('drops the one that is about the catalogue and not the chart', () => {
    const kept = shownToAPerson([group('BirthTimeUnknown', 6), group('MaterialWithdrawn')]);

    expect(kept.map((g) => g.reason)).toEqual(['BirthTimeUnknown']);
  });

  it('leaves nothing to show when that is all there was', () => {
    expect(shownToAPerson([group('MaterialWithdrawn')])).toEqual([]);
  });

  /**
   * Filtered at the display, never at the source. The response still carries the
   * group: the API must not misreport which rules fired, and a reviewer needs to
   * see that a documented rule exists and why it never runs. D22's shape — the
   * data keeps everything and the screen decides.
   */
  it('does not modify what it was given', () => {
    const groups = [group('MaterialWithdrawn'), group('BirthTimeUnknown')];
    const before = JSON.stringify(groups);

    shownToAPerson(groups);

    expect(JSON.stringify(groups)).toBe(before);
  });
});
