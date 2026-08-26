import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import bundle from '../../../../public/i18n/content/en.json';

/**
 * Nothing in the designer names a price.
 *
 * <b>Not per stone, not per bead, not a total, not a "from", not a currency
 * symbol, not a placeholder, not a disabled control that would hold one, not a
 * tooltip promising one later, and not a ticker.</b> The backend computes no
 * price at all, so any number the screen showed would be invented here — and a
 * bracelet is quoted after the stones are sourced, not before.
 *
 * A grep, deliberately, and over the same sources the no-trigonometry check
 * walks. The rule is about what the source may contain: a behavioural test can
 * only assert about a screen someone thought to render, and the failure mode
 * here is a control nobody meant to ship.
 */
describe('no price in the designer', () => {
  const designerDir = join(process.cwd(), 'src/app/features/designer');

  const sources = readdirSync(designerDir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
    .map((name) => ({ name, text: readFileSync(join(designerDir, name), 'utf8') }));

  /**
   * Currency signs and the money words.
   *
   * `\p{Sc}` is every currency symbol Unicode knows, which is the point — this
   * has to fail on ₾ and ₽ as readily as on $, because the shop is Georgian.
   *
   * The words are matched on their own, not as substrings: `cost` inside
   * `costly` is prose and `GEL` inside `ANGEL` is a stone. The money guard on
   * the backend learned this the expensive way, matching a GUID that happened to
   * contain `fee`.
   */
  const SYMBOLS = /\p{Sc}/u;

  /*
    In TypeScript `$` is not money, it is `${...}` in every template literal we
    write — a naive `\p{Sc}` sweep flagged five files on their own
    interpolations. So source is checked for any currency symbol *except* the
    dollar sign, plus a dollar sign that is actually quoting an amount.
  */
  const SOURCE_SYMBOLS = /(?!\$)\p{Sc}/u;
  const DOLLAR_AMOUNT = /\$\s*\d/;
  const WORDS =
    /\b(price|prices|priced|pricing|cost|costs|total|totals|subtotal|amount|currency|checkout|cart|GEL|USD|EUR|RUB|lari|dollars?|euros?)\b/i;

  it('has designer sources to check', () => {
    expect(sources.length).toBeGreaterThan(5);
  });

  it.each(sources.map((s) => s.name))('%s names no price', (name) => {
    const source = sources.find((s) => s.name === name)!;

    /*
      Comments say the word "price" constantly, explaining why there is none, so
      they are stripped or this fails on its own justification.

      <b>Including HTML comments.</b> These components hold their templates
      inline, and `<!-- -->` was not being stripped — so a `//` comment could
      explain the rule and a template comment three lines away could not, which is
      an inconsistency rather than a stricter rule. Angular removes template
      comments at compile time, so nothing in one can reach a customer any more
      than a JavaScript comment can. Found when an aside about an undo costing
      nothing failed the build.
    */
    const code = source.text
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');

    expect(SOURCE_SYMBOLS.test(code), `${name} contains a currency symbol`).toBe(false);
    expect(DOLLAR_AMOUNT.test(code), `${name} quotes a dollar amount`).toBe(false);
    expect(WORDS.test(code), `${name} contains money vocabulary`).toBe(false);
  });

  /**
   * And the copy, which is the half a source grep cannot see: the strings the
   * screen actually renders live in the translation bundle, not in the template.
   */
  it('no designer copy names a price', () => {
    const designer = (bundle as unknown as Record<string, Record<string, unknown>>)['STONECRAFT'][
      'DESIGNER'
    ] as Record<string, unknown>;

    const strings: string[] = [];
    const walk = (node: unknown) => {
      if (typeof node === 'string') strings.push(node);
      else if (node && typeof node === 'object') Object.values(node).forEach(walk);
    };
    walk(designer);

    expect(strings.length).toBeGreaterThan(10);

    for (const value of strings) {
      expect(SYMBOLS.test(value), `copy contains a currency symbol: ${value}`).toBe(false);
    }
  });

  /**
   * The one place the word is allowed, because it is a denial.
   *
   * The finish control explains that Standard and Premium describe how the beads
   * are cut, not what they cost — someone who reads "Premium" and assumes a
   * price tier has been told something false by omission. If this copy ever
   * disappears the control starts implying a price again, so its absence is a
   * failure and not a cleanup.
   */
  it('the finish control still says it is not a price tier', () => {
    const designer = (bundle as unknown as Record<string, Record<string, Record<string, string>>>)[
      'STONECRAFT'
    ]['DESIGNER'];

    const denials = Object.values(designer).filter(
      (value) => typeof value === 'string' && /not a price tier/i.test(value),
    );

    expect(denials).toHaveLength(1);
  });
});
