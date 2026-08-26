import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, path), 'utf8');

/**
 * <b>The rope is asked about with a material, and that material is a lie.</b>
 *
 * The solver's demand path will not answer "how many beads of this diameter
 * close a ring on this wrist" without being given some material to fill the ring
 * with. Ring geometry depends only on the diameters, so which material is asked
 * about does not change the answer — but the response comes back with every slot
 * naming it, complete with a SKU and a canonical English name.
 *
 * <b>If any of that reaches the screen, the designer shows a stone nobody
 * chose</b> — twenty-six onyx beads on a bracelet the person built out of
 * garnet — and it would look entirely plausible. Worse, it would look plausible
 * to whoever wrote it, because the probe is a real stone from the real
 * catalogue.
 *
 * So the rule is: from the rope, read the geometry and nothing else. The stones
 * come from `placed`, which is built from the person's own strand.
 *
 * These are greps because the failure is a *source* the renderer reads from, not
 * a value it produces — a behavioural test would need the probe and the chosen
 * stone to differ in the fixture to catch it at all, which is exactly the
 * condition someone would forget to set up.
 */
describe('the rope carries geometry and nothing else', () => {
  const view = read('strand/strand-view.component.ts');
  const store = read('bracelet-design.store.ts');

  it('is declared exactly once', () => {
    const declarations = store.match(/ROPE_PROBE_SLUG\s*=/g) ?? [];

    expect(declarations).toHaveLength(1);
  });

  it('never reaches the renderer', () => {
    expect(view).not.toMatch(/ROPE_PROBE_SLUG/);
  });

  /**
   * The three fields on a solved slot that name a stone. The renderer may read a
   * slot's position and geometry; reading its identity is the bug.
   */
  it('does not read a stone identity off the rope', () => {
    for (const field of ['materialSlug', 'canonicalNameEn', 'sku', 'sourceMaterialSlug']) {
      const reads = view.match(new RegExp(`\\\\bslot\\\\.${field}\\\\b`, 'g')) ?? [];

      expect(reads, `strand-view reads slot.${field} from the rope`).toEqual([]);
    }
  });

  it('takes its stones from what the person placed', () => {
    // The label, the artwork and the tally all key off `placed`.
    expect(view).toMatch(/beadImage\(socket\.stone\.slug\)/);
    expect(view).toMatch(/for \(const stone of this\.placed\(\)\)/);
  });

  /**
   * <b>The rope is asked for as a whole bracelet, not as the stones so far.</b>
   *
   * It sends the placed stones AND the fillers that finish the ring, so the
   * answer is the full-length bracelet and the ring cannot grow as stones
   * arrive. A request carrying only `this.strand()` would be the old model back
   * again.
   */
  it('asks for the whole rope, placed stones and fillers together', () => {
    const request = /readonly solved = toSignal\([\s\S]*?\n  \);/.exec(store)?.[0] ?? '';

    expect(request).toMatch(/\.\.\.request\.placed/);
    expect(request).toMatch(/length: fillers/);
    expect(request).toMatch(/wristCircumferenceMm/);
  });

  /**
   * <b>Keyed on the sizes, not on the stones.</b>
   *
   * Swapping one stone for another of the same size does not change the shape of
   * the rope by a micrometre, and neither does placing a stone the same size as
   * the filler — it takes a place a filler was already holding. Keying on the
   * strand itself would ask the solver the same question once per bead.
   */
  it('does not re-ask for a stone of a size already on the rope', () => {
    const key = /const ropeKey = [\s\S]*?\n  \]\.join\('\|'\);/.exec(store)?.[0] ?? '';

    expect(key).toMatch(/diameterMm/);
    expect(key).not.toMatch(/materialSlug/);
    expect(key).toMatch(/fillerDiameterMm/);
  });
});
