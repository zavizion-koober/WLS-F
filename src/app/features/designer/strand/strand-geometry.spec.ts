import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ConfiguredBeadSlot, ConfiguredBraceletResponse } from '@core/models/bracelets.models';

import { layoutStrand } from './strand-geometry';

const featureDir = dirname(fileURLToPath(import.meta.url));
const designerDir = join(featureDir, '..');

const slot = (over: Partial<ConfiguredBeadSlot>): ConfiguredBeadSlot => ({
  position: 0,
  sku: 'PROV-ONYX-08-STD',
  materialSlug: 'onyx',
  canonicalNameEn: 'Onyx',
  diameterMm: 8,
  grade: 'Standard',
  lock: 'None',
  sourceMaterialSlug: null,
  centreXMm: 0,
  centreYMm: -33.2,
  ...over,
});

/**
 * A solved bracelet as the backend returns one: a square strand, so the expected
 * centres are checkable by hand without reimplementing the solver in the test.
 */
const configuration = (
  over: Partial<ConfiguredBraceletResponse> = {},
): ConfiguredBraceletResponse => ({
  publicId: 'cfg-1',
  templateSlug: 'classic',
  wristCircumferenceMm: 170,
  beadCount: 4,
  innerCircumferenceMm: 120,
  ringRadiusMm: 10,
  fitDeviationMm: 1.5,
  solverVersion: 'solver-1',
  rulePackVersion: 'v1',
  calcVersion: null,
  slots: [
    slot({ position: 0, centreXMm: 0, centreYMm: -10 }),
    slot({ position: 1, centreXMm: 10, centreYMm: 0 }),
    slot({ position: 2, centreXMm: 0, centreYMm: 10 }),
    slot({ position: 3, centreXMm: -10, centreYMm: 0 }),
  ],
  ...over,
});

describe('strand layout', () => {
  it('places every slot the backend sent', () => {
    expect(layoutStrand(configuration()).beads).toHaveLength(4);
  });

  it('scales and translates, and nothing else', () => {
    const laid = layoutStrand(configuration());
    const { centre } = laid;

    // Bead 0 is directly above the centre; bead 2 directly below, the same distance.
    expect(laid.beads[0].cx).toBeCloseTo(centre, 6);
    expect(laid.beads[2].cx).toBeCloseTo(centre, 6);
    expect(centre - laid.beads[0].cy).toBeCloseTo(laid.beads[2].cy - centre, 6);

    // Beads 1 and 3 are on the horizontal, mirrored.
    expect(laid.beads[1].cy).toBeCloseTo(centre, 6);
    expect(laid.beads[3].cy).toBeCloseTo(centre, 6);
    expect(laid.beads[1].cx - centre).toBeCloseTo(centre - laid.beads[3].cx, 6);
  });

  it('keeps y downward, as the backend sends it', () => {
    // A renderer that flipped y would draw a mirror image of the bracelet, which
    // is only detectable on an asymmetric strand — i.e. in production, by a
    // customer.
    const laid = layoutStrand(configuration());
    expect(laid.beads[0].cy).toBeLessThan(laid.centre);
    expect(laid.beads[2].cy).toBeGreaterThan(laid.centre);
  });

  it('uses one scale for positions and sizes', () => {
    // If a bead's rendered diameter and its distance from centre used different
    // scales, adjacent beads would overlap or gap — the ring would stop looking
    // strung without any single number looking wrong.
    const laid = layoutStrand(configuration());
    const positionScale = (laid.beads[1].cx - laid.centre) / 10;
    const sizeScale = laid.beads[1].size / 8;

    expect(sizeScale).toBeCloseTo(positionScale, 9);
  });

  it('puts the ring radius on the same scale as the beads', () => {
    const laid = layoutStrand(configuration());
    const distance = laid.centre - laid.beads[0].cy;

    expect(laid.ringRadius).toBeCloseTo(distance, 6);
  });

  it('grows on screen when the bracelet grows', () => {
    // The scale is fixed rather than fitted to each bracelet, so changing wrist
    // size visibly changes the ring. A renormalised layout would make every
    // bracelet the same size on screen and silently remove the feedback the size
    // control exists to give.
    const small = layoutStrand(configuration({ ringRadiusMm: 20 }));
    const large = layoutStrand(configuration({ ringRadiusMm: 35 }));

    expect(large.ringRadius).toBeGreaterThan(small.ringRadius);
    expect(large.extent).toBe(small.extent);
  });

  it('keeps the largest plausible bracelet inside the surface', () => {
    // 210 mm wrist at 12 mm beads is the biggest the provisional sizing table can
    // produce. Its outer edge must not clip.
    const laid = layoutStrand(
      configuration({
        ringRadiusMm: 37,
        slots: [slot({ position: 0, diameterMm: 12, centreXMm: 0, centreYMm: -37 })],
      }),
    );

    const outerEdge = laid.centre - laid.beads[0].cy + laid.beads[0].size / 2;
    expect(outerEdge).toBeLessThan(laid.extent / 2);
  });

  it('handles an empty strand without dividing by anything', () => {
    expect(layoutStrand(configuration({ slots: [], beadCount: 0 })).beads).toEqual([]);
  });
});

/**
 * <b>§37, enforced rather than remembered.</b>
 *
 * The bracelet's geometry is the solver's. Every bead position arrives as a
 * millimetre offset; the client scales and translates. A component that reached
 * for `Math.sin` would be recomputing the closure condition
 * `2·asin((dᵢ + dᵢ₊₁) / (4R))` — a second implementation that can disagree with
 * the first, silently, as a ring that does not quite close.
 *
 * This is a grep, and a grep is the right shape of test for it: the rule is about
 * what the source may contain, not about what any one function returns.
 */
describe('no geometry in the client', () => {
  /*
    Extended for dragging.

    A drag implementation reaches naturally for `atan2` — pointer angle around
    the centre, divided by the step, gives an index. It is wrong twice over: it
    is a second implementation of the solver's closure condition, which will
    disagree with the server on any mixed-diameter strand, and the beads are not
    evenly spaced when their diameters differ, so the answer is simply not the
    nearest bead. Nearest centre by SQUARED distance is both correct and free of
    geometry.

    `hypot` is named for the same reason a square root is avoided: the
    comparison is identical without one, and its absence is what keeps this file
    obviously free of trigonometry rather than arguably so. Bare calls are
    matched as well as `Math.`-qualified ones, because a destructured
    `const { atan2 } = Math` would pass a check that only looked for the prefix.
  */
  const FORBIDDEN = /\b(?:Math\.)?(sin|cos|tan|asin|acos|atan|atan2|hypot)\s*\(/;

  const sources = readdirSync(designerDir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .map((name) => ({ name, text: readFileSync(join(designerDir, name), 'utf8') }));

  it('has designer sources to check', () => {
    expect(sources.length).toBeGreaterThan(2);
  });

  it.each(sources.map((s) => s.name))('%s contains no trigonometry', (name) => {
    const source = sources.find((s) => s.name === name)!;

    // Comments explain the rule and name the functions, so they are stripped
    // first — otherwise this passes or fails on its own explanation.
    const code = source.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

    expect(FORBIDDEN.test(code), `${name} performs trigonometry`).toBe(false);
  });

  it('does not reach for Math.PI either', () => {
    for (const source of sources) {
      const code = source.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

      // Dividing a circle into equal parts is the specific wrong answer here: it
      // is right only when every adjacent pair of beads sums to the same
      // diameter, and wrong in a way that looks plausible when they do not.
      expect(code.includes('Math.PI'), `${source.name} divides a circle`).toBe(false);
    }
  });
});
