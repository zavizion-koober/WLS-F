import { describe, expect, it } from 'vitest';

import bundle from '../../../../public/i18n/content/en.json';

import { RULEPACK_REASON_KEYS } from './rulepack-reason-keys';

/**
 * The equality this protects: the active rulepack carries 57 reason keys, and
 * `reason-keys.en.json` has an entry for all 57. That is not a coincidence to be
 * admired, it is an invariant to be enforced — the backend returns keys and
 * never prose, so a key with no entry renders as a raw dot-path in front of a
 * customer, and it does so silently.
 *
 * The key set is compared against a fixture extracted from StoneCraft-B's seed
 * (`tools/extract-rulepack-keys.mjs`), not against the copy file, so this test
 * cannot pass by comparing the file with itself. When a rule is added to the
 * rulepack, regenerating the fixture makes this test fail until someone writes
 * the sentence — which is the point.
 */

type ReasonEntry = { short?: unknown; long?: unknown };

const REASONS = (bundle as Record<string, any>)['STONECRAFT']?.['REASONS'] as
  Record<string, unknown> | undefined;

/** ngx-translate resolves a dot path through nested objects; so does this. */
function lookup(path: string): ReasonEntry | null {
  let node: unknown = REASONS;
  for (const segment of path.split('.')) {
    if (node === null || typeof node !== 'object') return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return node !== null && typeof node === 'object' ? (node as ReasonEntry) : null;
}

describe('reason key coverage', () => {
  it('nests the copy under STONECRAFT.REASONS', () => {
    expect(REASONS).toBeDefined();
  });

  it('has a short and a long string for every key the active rulepack can emit', () => {
    const missing: string[] = [];
    const incomplete: string[] = [];

    for (const key of RULEPACK_REASON_KEYS) {
      const entry = lookup(key);
      if (entry === null) {
        missing.push(key);
        continue;
      }
      if (typeof entry.short !== 'string' || entry.short.length === 0)
        incomplete.push(`${key}.short`);
      if (typeof entry.long !== 'string' || entry.long.length === 0) incomplete.push(`${key}.long`);
    }

    expect({ missing, incomplete }).toEqual({ missing: [], incomplete: [] });
  });

  it('covers exactly the active rulepack — 57 keys, no more', () => {
    // Extra entries are a defect too, not harmless surplus. A key nothing emits
    // is copy nobody reviews against a rule, and it is how a fabricated rule's
    // sentence outlives the rule that was removed for being fabricated.
    // Still 57, and one of them is asleep. D23 withdrew `opal`, which left
    // PAV-PROHIBIT-VENUS-AFFLICTED-OPAL with nothing to caution against — but the
    // rule is emitted DORMANT rather than deleted, so that restoring the stone
    // restores Pavitt's warning about it too. Its key and its sentence stay with
    // it.
    //
    // That is not the orphan-copy case this test guards against. An orphan is a
    // sentence with no rule anywhere; this is a sentence whose rule is in the
    // pack and inactive, which the fixture reflects because it reads the pack
    // rather than filtering it. If the rule were ever really deleted, the
    // extractor would drop the key and this test would fail on the surplus.
    expect(RULEPACK_REASON_KEYS).toHaveLength(57);
    expect(countLeaves(REASONS ?? {})).toBe(RULEPACK_REASON_KEYS.length);
  });

  it('excludes the twelve pending Ascendant keys', () => {
    // Those rules are loaded for review and barred from producing output. Copy
    // for them would be copy for sentences no customer should ever read.
    const ascendant = RULEPACK_REASON_KEYS.filter((k) => k.endsWith('.ascendant'));
    expect(ascendant).toEqual([]);
  });
});

/** Counts `{ short, long }` leaves anywhere in the tree. */
function countLeaves(node: Record<string, unknown>): number {
  let total = 0;
  for (const value of Object.values(node)) {
    if (value === null || typeof value !== 'object') continue;
    const entry = value as ReasonEntry;
    if (typeof entry.short === 'string' && typeof entry.long === 'string') {
      total += 1;
    } else {
      total += countLeaves(value as Record<string, unknown>);
    }
  }
  return total;
}

/**
 * The chart's content key.
 *
 * `chart.ruler.rulesAscendant` is emitted by the backend the same way a reason
 * key is — a key, never a sentence — but it is deliberately outside the
 * `reason.*` namespace, because a chart fact is not a rule hit and anything
 * counting what the rulepack can emit must not find it among them. It therefore
 * needs its own home and its own check, or it is the one content key with no
 * coverage at all.
 *
 * The constant is `CustomerChartProjection.ChartRulerReasonKey` on the backend.
 * If that string changes, this fails.
 */
describe('chart content keys', () => {
  const CHART_KEYS = ['chart.ruler.rulesAscendant'];

  const keys = (bundle as Record<string, any>)['STONECRAFT']?.['CHART']?.['KEYS'] as
    Record<string, unknown> | undefined;

  function lookupChart(path: string): unknown {
    let node: unknown = keys;
    for (const segment of path.split('.')) {
      if (node === null || typeof node !== 'object') return null;
      node = (node as Record<string, unknown>)[segment];
    }
    return node;
  }

  it.each(CHART_KEYS)('has copy for %s', (key) => {
    const entry = lookupChart(key);
    expect(typeof entry).toBe('string');
    expect(entry).not.toBe('');
  });

  it('lives outside the rulepack namespace', () => {
    // A chart key under STONECRAFT.REASONS would be counted as a rulepack key by
    // the coverage test above, and the 57-key equality would start passing for
    // the wrong reason.
    for (const key of CHART_KEYS) {
      expect(key.startsWith('reason.')).toBe(false);
      expect(lookup(key)).toBeNull();
    }
  });

  it('interpolates rather than naming a body or a sign in the copy', () => {
    // The sentence has to work for any planet and any rising sign. Hardcoding
    // "Venus" would be prose about one chart pretending to be a content key.
    const sentence = lookupChart('chart.ruler.rulesAscendant') as string;
    expect(sentence).toContain('{{body}}');
    expect(sentence).toContain('{{sign}}');
  });
});
