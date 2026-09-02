import type { BeadGrade } from './api-enums';
import type { StrandPosition } from './bracelets.models';
import type { CustomerRecommendation } from './gemstones.models';

export type { StrandPosition };

/**
 * Saved custom bracelet design.
 *
 * Represents an editable, persistent bracelet configuration created from
 * an astrological reading session.
 */
export interface SavedBracelet {
  readonly id: string;
  readonly name: string;
  readonly readingPublicId: string;
  readonly strand: readonly StrandPosition[];
  readonly wristMm: number;
  readonly diameterMm: number;
  readonly grade: BeadGrade;
  readonly spacerStyle: 'none' | 'gold' | 'silver' | 'hematite';
  readonly price: number;
  readonly priceBreakdown: CustomBraceletPriceBreakdown;
  readonly stones: readonly SavedBraceletStoneSummary[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: 'draft' | 'saved' | 'in_cart' | 'ordered';
  readonly orderId?: string | null;
}

export interface SavedBraceletStoneSummary {
  readonly slug: string;
  readonly name: string;
  readonly count: number;
  readonly diameterMm: number;
}

export interface CustomBraceletPriceBreakdown {
  readonly baseCraftPrice: number;
  readonly beadCount: number;
  readonly beadsSubtotal: number;
  readonly gradeExtra: number;
  readonly spacerExtra: number;
  readonly totalPrice: number;
}

/** Base crafting and consecration fee in GEL (₾). */
export const BASE_CRAFT_PRICE = 85;

/** Cost per bead based on diameter in GEL (₾). */
export const BEAD_BASE_PRICE_BY_DIAMETER: Record<number, number> = {
  6: 3.0,
  8: 3.5,
  10: 4.5,
  12: 5.5,
};

/** Additional fee for Premium artisanal bead finish in GEL (₾). */
export const GRADE_PREMIUM_FEE = 25;

/** Additional fee for consecrated metallic spacer beads in GEL (₾). */
export const SPACER_FEES: Record<string, number> = {
  none: 0,
  gold: 15,
  silver: 12,
  hematite: 8,
};

/**
 * Calculates transparent live price for a custom bracelet configuration.
 */
export function calculateCustomBraceletPrice(
  strand: readonly StrandPosition[],
  diameterMm: number,
  grade: BeadGrade,
  spacerStyle: 'none' | 'gold' | 'silver' | 'hematite' = 'none',
): CustomBraceletPriceBreakdown {
  const beadCount = strand.length;
  const unitPrice = BEAD_BASE_PRICE_BY_DIAMETER[diameterMm] ?? 3.5;
  const beadsSubtotal = Math.round(beadCount * unitPrice);
  const gradeExtra = grade === 'Premium' ? GRADE_PREMIUM_FEE : 0;
  const spacerExtra = SPACER_FEES[spacerStyle] ?? 0;
  const totalPrice = BASE_CRAFT_PRICE + beadsSubtotal + gradeExtra + spacerExtra;

  return {
    baseCraftPrice: BASE_CRAFT_PRICE,
    beadCount,
    beadsSubtotal,
    gradeExtra,
    spacerExtra,
    totalPrice,
  };
}

/**
 * Generates an initial balanced starting preset from the recommended stones.
 */
export function generateRecommendedPreset(
  recommendations: readonly CustomerRecommendation[],
  beadCount: number,
  diameterMm: number,
  grade: BeadGrade = 'Standard',
): StrandPosition[] {
  if (recommendations.length === 0 || beadCount <= 0) {
    return [];
  }

  // Pick top 1 to 4 primary stones
  const topStones = recommendations
    .filter((r) => !r.isCautioned)
    .slice(0, 4)
    .map((r) => r.representativeSlug || r.materialSlug);

  const slugs = topStones.length > 0 ? topStones : [recommendations[0].materialSlug];
  const positions: StrandPosition[] = [];

  if (slugs.length === 1) {
    for (let i = 0; i < beadCount; i++) {
      positions.push({ materialSlug: slugs[0], diameterMm, grade });
    }
    return positions;
  }

  if (slugs.length === 2) {
    // Alternating pattern 2-by-2 or 1-by-1
    for (let i = 0; i < beadCount; i++) {
      const slug = slugs[i % 2];
      positions.push({ materialSlug: slug, diameterMm, grade });
    }
    return positions;
  }

  // 3 or more stones: Symmetrical center + flanking pattern
  const [focal, secondary, tertiary, quaternary] = slugs;
  const palette = [secondary, focal, tertiary, quaternary ?? secondary].filter(Boolean);

  for (let i = 0; i < beadCount; i++) {
    const slug = palette[i % palette.length];
    positions.push({ materialSlug: slug, diameterMm, grade });
  }

  return positions;
}

/**
 * Auto-arranges beads into a symmetrical, harmonious pattern.
 */
export function autoArrangeStrand(strand: readonly StrandPosition[]): StrandPosition[] {
  if (strand.length <= 2) {
    return [...strand];
  }

  // Group by material slug
  const counts = new Map<string, StrandPosition[]>();
  for (const pos of strand) {
    const list = counts.get(pos.materialSlug) ?? [];
    list.push(pos);
    counts.set(pos.materialSlug, list);
  }

  // Sort groups by count descending
  const sortedGroups = [...counts.values()].sort((a, b) => b.length - a.length);

  const N = strand.length;
  const result: (StrandPosition | null)[] = new Array(N).fill(null);
  let left = 0;
  let right = N - 1;

  for (const items of sortedGroups) {
    for (let i = 0; i < items.length; i++) {
      if (left <= right) {
        if (i % 2 === 0 || left === right) {
          result[left++] = items[i];
        } else {
          result[right--] = items[i];
        }
      }
    }
  }

  const finalResult: StrandPosition[] = [];
  for (let i = 0; i < N; i++) {
    if (result[i] !== null) {
      finalResult.push(result[i]!);
    }
  }

  return finalResult.length === N ? finalResult : [...strand];
}

/**
 * Generates a default name for a bespoke bracelet.
 */
export function generateBraceletName(
  stones: readonly { name: string }[],
  readingPublicId?: string,
): string {
  if (stones.length === 0) {
    return 'Bespoke Talisman';
  }

  if (stones.length === 1) {
    return `${stones[0].name} Talisman`;
  }

  if (stones.length === 2) {
    return `${stones[0].name} & ${stones[1].name} Harmony`;
  }

  return `${stones[0].name} Celestial Synthesis`;
}
