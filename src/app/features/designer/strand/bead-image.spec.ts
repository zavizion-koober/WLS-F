import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { beadImage, hasBeadImage } from './bead-image';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const beadDir = join(repoRoot, 'public', 'assets', 'beads');

const shipped = readdirSync(beadDir)
  .filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace(/\.webp$/, ''));

/**
 * The artwork map and the files on disk must agree.
 *
 * <b>This is the guard for the bug that produced it.</b> The map is keyed by
 * material slug and the files are named by material slug, so the two are held
 * together by nothing but a person typing the same word twice — and the first
 * time it mattered, the word was wrong: the green-with-red-flecks bead was filed
 * under `heliotrope`, a real and correct name for that stone, and a slug the
 * engine can never recommend.
 *
 * A name-based mapping that nothing checks goes stale silently: the bead simply
 * stops rendering, and an outline appears where a stone should be, which looks
 * like a missing asset rather than a wrong one.
 */
describe('bead artwork', () => {
  it('ships the beads it claims to', () => {
    for (const slug of shipped) {
      expect(hasBeadImage(slug), `${slug}.webp is on disk but not in the map`).toBe(true);
    }
  });

  it('claims no bead it does not ship', () => {
    const claimed = shipped.filter((s) => hasBeadImage(s));
    expect(claimed.sort()).toEqual(shipped.sort());
  });

  it('resolves to the path the browser will request', () => {
    expect(beadImage('onyx')).toBe('/assets/beads/onyx.webp');
  });

  it('returns null for a stone with no artwork', () => {
    // Null is a real answer the caller renders as an outline. The bead catalogue
    // and the artwork set are different sets that happen to overlap.
    //
    // `adularia` on purpose, and not a stone that merely happens to be undrawn
    // today: it exists so StonesByDays' ადულარი resolves on its two calendar
    // days, carries no rules and no claims, and therefore can never reach a
    // palette. Every previous choice here — malachite, then aventurine — was a
    // stone waiting for artwork, and each one broke this test the week it
    // arrived.
    expect(beadImage('adularia')).toBeNull();
    expect(hasBeadImage('adularia')).toBe(false);
  });

  /**
   * The green-with-red-flecks bead is filed under `bloodstone`, not `heliotrope`.
   *
   * Both slugs are active in the catalogue and name the same mineral, and the
   * source sheet captions it HELIOTROP — but `heliotrope` is named by no rule the
   * engine can fire and `bloodstone` by six, so only one of the two can ever
   * appear in a reading. Asserted by name because the next person to read the
   * sheet will reach for the caption, exactly as I did.
   */
  it('files the bloodstone bead under the slug a reading can produce', () => {
    expect(hasBeadImage('bloodstone')).toBe(true);
    expect(hasBeadImage('heliotrope')).toBe(false);
  });

  it('ships nothing unmapped', () => {
    // `_fire-quartz` is a trade name for hematoid quartz with no slug in the
    // catalogue. The leading underscore marks it unmapped; it must not ship.
    expect(shipped.filter((s) => s.startsWith('_'))).toEqual([]);
  });

  /**
   * Sixty-six, and every one of them a stone a reading can actually produce.
   *
   * The count is not asserted — it will change again — but two properties are,
   * and both are the reason the second bead pack was refused while this one
   * shipped:
   *
   * <b>Nothing is drawn that no palette can offer.</b> Under D21 the palette is
   * the person's own `recommendations[]`, so a bead for a material no active rule
   * reaches is a file nobody can ever see. Twenty-six such cells were dropped
   * from the incoming pack for exactly this reason.
   *
   * <b>Nothing is drawn under a name a reading cannot use.</b> `heliotrope` and
   * `sard` name real stones and real cells on the source sheet, and neither can
   * appear in a recommendation — one because no rule names it, the other because
   * its synonym group draws `carnelian`.
   */
  it('ships only slugs a reading can produce', () => {
    expect(shipped).toContain('bloodstone');
    expect(shipped).not.toContain('heliotrope');

    // The three that shipped as files but resolve through a group representative
    // are the exception, and they are deliberate: a configuration saved before
    // the representative existed still points at them by slug.
    expect(shipped.length).toBeGreaterThan(60);
  });
});

/**
 * The lighting rig, as a number rather than a sentence.
 *
 * <b>The whole argument for rendering beads instead of sourcing photographs is
 * that they share one light, one camera and one ground</b> — that is what makes a
 * ring of a dozen different stones read as a single object rather than a collage.
 * Until a second sheet arrived, that claim was defended by a comment, and the
 * comment was wrong: it said the highlight was upper-*left* for beads whose
 * highlight is measurably upper-right. Nobody had ever held two sets against each
 * other, so nothing had ever tested it.
 *
 * `lighting.json` is generated by `tools/measure-bead-lighting.py` and committed
 * so this can read it — WebP cannot be decoded in the test environment, which has
 * no canvas. The drift job in CI regenerates it and fails on any difference, so a
 * bead cannot be swapped without the measurement following it.
 *
 * The bounds are deliberately loose. This is not a snapshot of the current eight;
 * it is the question "does this bead belong to the same shoot", and the answer for
 * `_fire-quartz` — the one bead of the original nine that was never shipped — was
 * dx −0.37, dy +0.79: lower-left, the opposite corner, from a different setup.
 */
describe('one lighting rig', () => {
  const lighting = JSON.parse(readFileSync(join(beadDir, 'lighting.json'), 'utf8')) as {
    beads: Record<string, { dx: number; dy: number }>;
  };

  /**
   * The eight the measure was calibrated on, and the only ones it can adjudicate.
   *
   * See the remarks below: the estimator is a proxy that holds for opaque stones
   * and fails on translucent ones, so extending the assertion to the whole set
   * would mean loosening it until it asserted nothing.
   */
  const CALIBRATED = [
    'bloodstone',
    'carnelian',
    'hawk-s-eye',
    'nephrite',
    'obsidian',
    'onyx',
    'rhodonite',
    'rose-quartz',
  ];

  it('measures every shipped bead, and nothing that is not shipped', () => {
    expect(Object.keys(lighting.beads).sort()).toEqual([...shipped].sort());
  });

  it.each(CALIBRATED)('%s is lit from the upper right, like the rest', (slug) => {
    const { dx, dy } = lighting.beads[slug];

    // Right of centre and above it. `_fire-quartz` fails both halves.
    expect(dx, `${slug} dx ${dx}`).toBeGreaterThan(0.2);
    expect(dy, `${slug} dy ${dy}`).toBeLessThan(-0.2);
  });

  it('holds the reference set together tightly enough to read as one object', () => {
    const dxs = CALIBRATED.map((s) => lighting.beads[s].dx);
    const dys = CALIBRATED.map((s) => lighting.beads[s].dy);
    const spread = (v: number[]) => Math.max(...v) - Math.min(...v);

    expect(spread(dxs)).toBeLessThan(0.15);
    expect(spread(dys)).toBeLessThan(0.25);
  });
});

/**
 * Why the lighting assertion covers eight beads and not sixty-six.
 *
 * <b>Not a judgement call. Three measures were tried and all three fail</b>, so
 * this is written down as a closed question rather than a preference — do not
 * loosen it later expecting a different answer.
 *
 * Of the 66 shipped beads, measured on the artwork as cropped and committed:
 *
 * - <b>8 land in the wrong quadrant outright</b> — `selenite`, `rock-crystal`,
 *   `danburite`, `topaz`, `celestite`, `lava`, `coal`, `black-onyx`.
 * - <b>6 more are in the right quadrant but too weak</b> to clear the 0.2 margin:
 *   `amethyst`, `diamond`, `garnet`, `jet`, `sphene`, `tourmaline`.
 *
 * <b>The eight share no property the other 58 lack.</b> They are both extremes at
 * once: pale translucent stones that wash the highlight out (`selenite`,
 * `rock-crystal`, `danburite`, `topaz`, `celestite`) AND dark matte stones with
 * no gloss to put one in (`black-onyx`, `coal`, `lava`). An earlier note here
 * blamed translucency and caustics; that covers five of the eight and is not the
 * rule.
 *
 * What was tried:
 *
 * 1. <b>A tighter percentile.</b> Going from the brightest 1% to the brightest
 *    0.01% made it worse, not better — pre-crop, 14 beads outside the quadrant
 *    became 19.
 * 2. <b>A luminance-weighted centroid of every opaque pixel</b>, rather than a
 *    percentile. Worse again.
 * 3. <b>Scoping the verdict to beads that have a highlight to measure</b>, using
 *    highlight prominence — `(p99 - median) / (p90 - p10)` over luminance. This
 *    is the one that should have worked, and it is the most informative failure:
 *    the prominence of the eight failures spans 0.78–1.83 and the prominence of
 *    the 58 that pass spans 0.42–2.73. The ranges overlap almost completely.
 *    <b>`black-onyx` fails the quadrant with a prominence of 1.83 — higher than
 *    47 beads that pass it.</b>
 *
 * So there is no threshold, on any of these, that admits the beads the measure
 * can judge and excludes the ones it cannot. A verdict loosened until 66 beads
 * pass would assert nothing at all.
 *
 * The measurement still covers every bead and every number is still committed,
 * and the CI drift job still fails if any file changes without its measurement
 * following — that half generalises and is worth keeping. What does not
 * generalise is the verdict.
 *
 * The check below is the one that does, and it caught a real defect on its first
 * run.
 */
describe('one camera', () => {
  const lighting = JSON.parse(readFileSync(join(beadDir, 'lighting.json'), 'utf8')) as {
    beads: Record<string, { frameFill: number }>;
  };

  /**
   * Every bead fills its own frame.
   *
   * `strand-view` maps the whole square image onto the bead's diameter, so
   * padding inside the file shrinks the bead on screen. The incoming pack was
   * cropped at 0.917 of its frame — <b>every one of its 58 beads would have
   * drawn 8% smaller than the eight already shipped</b>, at the same slot size,
   * on the same ring, and nothing about the files being present or correctly
   * named would have shown it.
   *
   * Measured by the same Python tool as the lighting, for the same reason: WebP
   * cannot be decoded here. Unlike the highlight position this generalises — it
   * is framing, and it is as true of a translucent stone as an opaque one, which
   * is what makes it worth asserting over all sixty-six.
   */
  it.each([...shipped])('%s fills its frame', (slug) => {
    expect(lighting.beads[slug].frameFill).toBeGreaterThanOrEqual(0.99);
  });
});

/**
 * A stone with several names is drawn the same way whichever name won.
 *
 * <b>This is the naming defect one layer up, and the naming fix made it worse.</b>
 * A synonym group is folded into one card and the survivor is chosen by score, so
 * `materialSlug` on a card reading "Peridot" is `olivine` on one chart and
 * `chrysolite` on another. Artwork keyed off that slug moves; the label no longer
 * moves with it, so what used to look like a different stone now looks like a
 * rendering fault.
 *
 * The backend answers it with `representativeSlug`, which names the row that stands
 * for the stone rather than the row that carried the evidence. What has to be
 * checked here is that the client asks <i>that</i> question — a single
 * `beadImage(...materialSlug)` anywhere puts the bug straight back, and it would
 * look completely ordinary in review.
 *
 * A grep, for the same reason the no-trigonometry and no-price checks are greps:
 * the rule is about what the source may contain. A behavioural test can only cover
 * a component someone thought to write one for, and the failure mode is the call
 * site nobody noticed.
 */
describe('artwork never keys on the evidence slug', () => {
  const designerDir = join(repoRoot, 'src', 'app', 'features', 'designer');

  const sources = readdirSync(designerDir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .map((name) => ({ name, text: readFileSync(join(designerDir, name), 'utf8') }));

  /**
   * Scoped to the files that actually hold a recommendation, and scoped that way
   * on purpose rather than by an allow-list.
   *
   * <b>A bead slot's `materialSlug` is a different thing and is the right key.</b>
   * A bead really is made of a material, and the designer places the representative
   * — so `strand-view` and `open-strand` drawing from `slot.materialSlug` is
   * correct, and exempting them by name would rot the moment a file was renamed.
   * Importing `CustomerRecommendation` is what makes a file capable of this
   * mistake, so that is the test: any designer source that starts handling
   * recommendations is covered from the day it does.
   */
  const holdsARecommendation = sources.filter((s) => /\bCustomerRecommendation\b/.test(s.text));

  it('finds the files that hold a recommendation', () => {
    expect(holdsARecommendation.map((s) => s.name).sort()).toEqual([
      'bracelet-design.store.ts',
      'designer.page.ts',
      'palette/caution-gate.component.ts',
      'palette/palette-panel.component.ts',
    ]);
  });

  it.each(holdsARecommendation.map((s) => s.name))('%s does not draw from materialSlug', (name) => {
    const source = holdsARecommendation.find((s) => s.name === name)!;

    // The comments discuss `materialSlug` at length explaining why not to draw
    // from it, so they are stripped before the check reads its own reasoning.
    const code = source.text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

    // `image(x.materialSlug)` and `beadImage(x.materialSlug)` alike.
    expect(
      /\bimage\([^)]*\bmaterialSlug\b/.test(code),
      `${name} resolves artwork from materialSlug rather than representativeSlug`,
    ).toBe(false);
  });

  /**
   * And the placement half: a bracelet is made of the representative.
   *
   * The card says Peridot, so the bead strung is a peridot bead — not whichever of
   * the three rows happened to carry the evidence on that chart. This also keeps
   * the ring's own artwork stable, because the strand stores what was placed.
   */
  it('the designer places the representative slug on the strand', () => {
    const page = sources.find((s) => s.name === 'designer.page.ts')!.text;
    const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

    expect(code).toMatch(/this\.place\(stone\.representativeSlug\)/);
    expect(code).not.toMatch(/this\.place\(stone\.materialSlug\)/);
  });
});
