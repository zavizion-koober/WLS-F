import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const FILES = [
  'src/app/features/designer/strand/strand-view.component.ts',
  'src/app/features/designer/controls/design-controls.component.ts',
  'src/app/features/designer/palette/palette-panel.component.ts',
  'src/styles/tailwind.css',
];

const source = (path: string) => readFileSync(join(repoRoot, path), 'utf8');

/** Every `…:focus` / `…:focus-visible { … }` block in a file. */
const focusBlocks = (code: string): string[] =>
  [...code.matchAll(/[^\s{}]+:focus(?:-visible)?\s*\{[^}]*\}/g)].map((m) => m[0]);

/**
 * <b>A focus indicator must survive forced-colors mode.</b>
 *
 * Windows High Contrast — `forced-colors: active` — <b>suppresses `box-shadow`
 * entirely and preserves `outline`</b>, recolouring the outline to a system
 * colour. The house pattern in this codebase was `outline: none` plus a
 * `box-shadow` ring, which puts the whole indicator into the one property the
 * mode is about to throw away: no focus indicator at all, on the ring, the chips,
 * the stones or the birth-date field, for the people who depend on focus
 * indicators most. WCAG 2.4.7, failed completely rather than cosmetically.
 *
 * <b>Why this is a grep and not a rendering test.</b> jsdom has no forced-colors
 * mode and no cascade to interrogate, so there is nothing to observe. The rule is
 * a property of the stylesheet, and a stylesheet is text. Written across all four
 * files rather than once per component because the pattern spread by being
 * copied, and the next control someone adds will be copied from one of these.
 */
describe('focus indicators survive forced-colors mode', () => {
  for (const file of FILES) {
    describe(file, () => {
      const blocks = focusBlocks(source(file));

      it('has focus rules at all, so the checks below are not vacuous', () => {
        expect(blocks.length).toBeGreaterThan(0);
      });

      it('never carries the indicator in a box-shadow', () => {
        const shadowed = blocks.filter((block) => /box-shadow\s*:/.test(block));

        expect(shadowed).toEqual([]);
      });

      it('draws every indicator with an outline that is not none', () => {
        // A `:focus { outline: none }` that only silences the UA ring is not an
        // indicator and is not asked to be one — the paired `:focus-visible`
        // rule is what has to draw.
        const drawing = blocks.filter((block) => !/outline\s*:\s*none/.test(block));

        expect(drawing.length).toBeGreaterThan(0);

        for (const block of drawing) {
          expect(block).toMatch(/outline\s*:\s*\d+px\s+solid/);
        }
      });
    });
  }

  /**
   * <b>Fail toward visible.</b>
   *
   * `.strand-svg:focus { outline: none }` is the only place in the designer that
   * removes a UA outline outright. An engine that does not understand
   * `:focus-visible` discards the rule that restores it as an invalid selector
   * while this one still applies — leaving that browser with no focus indicator
   * ever, keyboard included. Gating the removal keeps its own outline instead.
   */
  it('only removes the browser outline where it can prove it puts one back', () => {
    const code = source('src/app/features/designer/strand/strand-view.component.ts');

    const guarded =
      /@supports selector\(:focus-visible\)\s*\{\s*\.strand-svg:focus\s*\{\s*outline:\s*none;\s*\}/;

    expect(code).toMatch(guarded);
  });
});
