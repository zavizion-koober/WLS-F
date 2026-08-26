import { describe, expect, it } from 'vitest';

import en from '../../../../public/i18n/content/en.json';
import ka from '../../../../public/i18n/content/ka.json';
import ru from '../../../../public/i18n/content/ru.json';

/**
 * Every key English has, Georgian and Russian have too.
 *
 * `fallbackLang: 'en'` means a missing key renders English rather than a raw key
 * path, which is the correct failure — and also a silent one. A key added in
 * English only looks fine to whoever added it and stays English forever for two
 * of the three languages the shop ships. This is the check that makes the
 * omission loud at the moment it happens rather than in a customer's browser.
 *
 * Keys only, never values: a translation that happens to match the English is a
 * legitimate translation — a proper noun, an abbreviation, a stone's Latin name.
 */
type Tree = Record<string, unknown>;

/** Every leaf path in a bundle, dotted. */
function paths(node: unknown, prefix = ''): string[] {
  if (node === null || typeof node !== 'object') {
    return [prefix];
  }

  return Object.entries(node as Tree).flatMap(([key, value]) =>
    paths(value, prefix === '' ? key : `${prefix}.${key}`),
  );
}

const english = paths(en).sort();

describe('translation parity', () => {
  it('has English keys to compare against, so the checks are not vacuous', () => {
    expect(english.length).toBeGreaterThan(300);
  });

  it.each([
    ['ka', ka],
    ['ru', ru],
  ])('%s carries every key English does', (lang, bundle) => {
    const have = new Set(paths(bundle));
    const missing = english.filter((key) => !have.has(key));

    expect(missing, `${lang} is missing ${missing.length} keys`).toEqual([]);
  });

  /**
   * The other direction. A key that exists only in Georgian is copy nothing
   * renders — usually a rename that updated one bundle, which leaves the English
   * key missing and this is where that shows up as a pair of failures.
   */
  it.each([
    ['ka', ka],
    ['ru', ru],
  ])('%s carries no key English does not', (lang, bundle) => {
    const english_ = new Set(english);
    const extra = paths(bundle).filter((key) => !english_.has(key));

    expect(extra, `${lang} has ${extra.length} keys with no English original`).toEqual([]);
  });
});
