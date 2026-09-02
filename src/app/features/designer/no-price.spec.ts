import { describe, expect, it } from 'vitest';
import {
  BASE_CRAFT_PRICE,
  BEAD_BASE_PRICE_BY_DIAMETER,
  GRADE_PREMIUM_FEE,
  SPACER_FEES,
  calculateCustomBraceletPrice,
  generateBraceletName,
} from '@core/models/saved-bracelet.models';
import type { StrandPosition } from '@core/models/bracelets.models';

describe('Custom Bracelet Pricing & Manifest', () => {
  const makeStrand = (count: number, slug = 'amethyst'): StrandPosition[] =>
    Array.from({ length: count }, (_, i) => ({
      position: i,
      diameterMm: 8,
      grade: 'Standard',
      materialSlug: slug,
    }));

  it('calculates standard bracelet pricing with base craft fee and bead count', () => {
    const strand = makeStrand(20);
    const breakdown = calculateCustomBraceletPrice(strand, 8, 'Standard', 'none');

    const expectedBeads = Math.round(20 * BEAD_BASE_PRICE_BY_DIAMETER[8]);
    const expectedTotal = BASE_CRAFT_PRICE + expectedBeads;

    expect(breakdown.baseCraftPrice).toBe(BASE_CRAFT_PRICE);
    expect(breakdown.beadCount).toBe(20);
    expect(breakdown.beadsSubtotal).toBe(expectedBeads);
    expect(breakdown.gradeExtra).toBe(0);
    expect(breakdown.spacerExtra).toBe(0);
    expect(breakdown.totalPrice).toBe(expectedTotal);
  });

  it('adds premium grade finish surcharge when chosen', () => {
    const strand = makeStrand(22);
    const breakdown = calculateCustomBraceletPrice(strand, 10, 'Premium', 'none');

    const expectedBeads = Math.round(22 * BEAD_BASE_PRICE_BY_DIAMETER[10]);
    const expectedTotal = BASE_CRAFT_PRICE + expectedBeads + GRADE_PREMIUM_FEE;

    expect(breakdown.gradeExtra).toBe(GRADE_PREMIUM_FEE);
    expect(breakdown.totalPrice).toBe(expectedTotal);
  });

  it('adds spacer surcharge when metal spacers are added', () => {
    const strand = makeStrand(20);
    const breakdown = calculateCustomBraceletPrice(strand, 8, 'Standard', 'gold');

    const expectedBeads = Math.round(20 * BEAD_BASE_PRICE_BY_DIAMETER[8]);
    const expectedTotal = BASE_CRAFT_PRICE + expectedBeads + SPACER_FEES['gold'];

    expect(breakdown.spacerExtra).toBe(SPACER_FEES['gold']);
    expect(breakdown.totalPrice).toBe(expectedTotal);
  });

  it('generates harmonic talisman names from manifest stones', () => {
    const manifest = [
      { slug: 'amethyst', name: 'Amethyst', count: 12, img: null },
      { slug: 'obsidian', name: 'Obsidian', count: 10, img: null },
    ];

    const name = generateBraceletName(manifest, 'session-abc');
    expect(name).toBe('Amethyst & Obsidian Harmony');
  });

  it('handles empty manifest with bespoke fallback name', () => {
    const name = generateBraceletName([], 'session-123456');
    expect(name).toContain('Bespoke Talisman');
  });
});
