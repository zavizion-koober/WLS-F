import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const read = (name: string) => readFileSync(join(here, name), 'utf8');

/**
 * <b>Two controls, one implementation.</b>
 *
 * Clearing the board is offered in more than one place — beside the ring while
 * building, and behind "Start over" once a design is saved. Those are two
 * entrances to the same room. The failure this guards against is not a bug in
 * either of them; it is a second `strand.set([])` written next to a control
 * because it was quicker than reaching for the store, which then does not clear
 * the selection, or the last geometry, or arm the undo offer, and which nobody
 * notices until a customer's cleared board still shows a stale fit reading.
 *
 * Counting call sites is the only way to state "there is exactly one of these".
 * A behavioural test can prove each control works; it cannot prove they are the
 * same code.
 */
describe('there is one way to empty the strand', () => {
  const store = read('bracelet-design.store.ts');
  const page = read('designer.page.ts');

  it('only the store empties it, and only once', () => {
    const empties = store.match(/this\.strand\.set\(\[\]\)/g) ?? [];

    expect(empties).toHaveLength(1);
  });

  it('the page never empties it itself', () => {
    expect(page).not.toMatch(/strand\.set\(/);
  });

  it('every control reaches that one implementation', () => {
    const controls = page.match(/\(click\)="clear\(\)"/g) ?? [];
    const calls = page.match(/this\.store\.reset\(\)/g) ?? [];

    // More than one control...
    expect(controls.length).toBeGreaterThanOrEqual(2);
    // ...and one call between them.
    expect(calls).toHaveLength(1);
  });

  /**
   * The reading store has its own `reset` for its own state. Naming the file it
   * is allowed to live in keeps this guard from being read as "no other feature
   * may use the word".
   */
  it('does not object to the reading store having one of its own', () => {
    expect(read('../reading/reading.store.ts')).toMatch(/reset\(\): void/);
  });
});
