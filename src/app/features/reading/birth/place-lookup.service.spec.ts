import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaceLookupService, type Place } from './place-lookup.service';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');

const file = JSON.parse(readFileSync(join(repoRoot, 'public', 'data', 'cities.json'), 'utf8')) as {
  _attribution: Record<string, string>;
  countries: Record<string, [string, number, number, number | null][]>;
};

const rows = Object.entries(file.countries).flatMap(([country, cities]) =>
  cities.map(([label, lat, lon, elevation]) => ({ country, label, lat, lon, elevation })),
);

describe('the shipped city dataset', () => {
  it('is grouped by country and carries every place', () => {
    expect(Object.keys(file.countries).length).toBeGreaterThan(200);
    expect(rows.length).toBeGreaterThan(33_000);
  });

  /**
   * <b>The load-bearing assertion in this file.</b>
   *
   * The upstream dataset carries a `utcOffset` column: a standard offset with no
   * DST and no history. It says Georgia is +4; Georgia was on +5 in May 1990,
   * because the USSR moved to summer time on 25 March that year. One hour at
   * 01:30 moves the Ascendant about 15°, which changes the rising sign, the
   * chart ruler, and every stone ranked beneath it.
   *
   * `BirthInput.UtcOffsetHours` is a fallback used only when no zone resolves,
   * so a wrong value there is a wrong value nothing downstream can correct.
   *
   * The column is therefore dropped at build time rather than merely ignored,
   * because a field that is not in the artefact cannot be sent from it.
   */
  it('carries no time zone or UTC offset, anywhere, at any depth', () => {
    const raw = readFileSync(join(repoRoot, 'public', 'data', 'cities.json'), 'utf8');

    expect(raw).not.toContain('utcOffset');
    expect(raw).not.toContain('timeZone');
    expect(raw).not.toContain('timezone');

    // And the tuples are exactly four wide: city, lat, lon, elevation.
    for (const cities of Object.values(file.countries)) {
      expect(cities[0]).toHaveLength(4);
    }
  });

  it('carries its attribution inside the artefact', () => {
    // CC BY 4.0 is a licence term, and an attribution stored next to the data it
    // describes cannot drift away from it.
    expect(file._attribution['source']).toContain('GeoNames');
    expect(file._attribution['licence']).toBe('CC BY 4.0');
    expect(file._attribution['licenceUrl']).toContain('creativecommons.org');
  });

  it('has plausible coordinates on every row', () => {
    for (const row of rows) {
      if (row.lat < -90 || row.lat > 90 || row.lon < -180 || row.lon > 180) {
        throw new Error(`out of range: ${row.label}, ${row.country} (${row.lat}, ${row.lon})`);
      }
    }
    expect(rows.length).toBeGreaterThan(0);
  });

  /**
   * `-9999` is GeoNames' no-data sentinel in the `dem` column. Passed through, it
   * would fail the backend's own elevation validator (-500..9000) and turn a
   * missing altitude into a 400 on an otherwise valid birth record.
   */
  it('never carries the GeoNames no-data sentinel as an elevation', () => {
    const sentinels = rows.filter((r) => r.elevation === -9999);
    expect(sentinels).toEqual([]);
  });

  it('keeps unknown elevation distinct from sea level', () => {
    // null means unknown; 0 means the place is at sea level. Collapsing the two
    // would be a small dishonesty that is impossible to undo later.
    expect(rows.some((r) => r.elevation === null)).toBe(true);
    expect(rows.some((r) => r.elevation === 0)).toBe(true);
  });

  it('keeps every elevation inside the range the backend accepts', () => {
    for (const row of rows) {
      if (row.elevation !== null && (row.elevation < -500 || row.elevation > 9000)) {
        throw new Error(`elevation out of range: ${row.label} (${row.elevation})`);
      }
    }
    expect(rows.length).toBeGreaterThan(0);
  });

  /**
   * Georgia is the launch market and was the thinnest coverage in the source —
   * seventeen entries, three of them in occupied territories.
   */
  it('has real coverage for Georgia, the launch market', () => {
    const georgia = file.countries['Georgia'];

    expect(georgia.length).toBeGreaterThan(300);

    const names = new Set(georgia.map(([label]) => label));
    for (const town of ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Zugdidi', 'Mtskheta']) {
      expect(names.has(town), `${town} missing`).toBe(true);
    }
  });

  it('has no duplicate coordinate', () => {
    const seen = new Set(rows.map((r) => `${r.lat},${r.lon}`));
    expect(seen.size).toBe(rows.length);
  });
});

describe('place lookup', () => {
  let places: PlaceLookupService;

  const CITIES = {
    _attribution: file._attribution,
    countries: {
      Georgia: [
        ['Tbilisi', 41.6914, 44.8341, 433],
        ['Batumi', 41.6408, 41.6306, 8],
      ],
      Paraguay: [['Asunción', -25.2637, -57.5759, 43]],
      Brazil: [['São Paulo', -23.5505, -46.6333, 760]],
      Norway: [['Bodø', 67.28, 14.405, null]],
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => CITIES })),
    );
    TestBed.configureTestingModule({});
    places = TestBed.inject(PlaceLookupService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('starts idle and fetches nothing until asked', () => {
    expect(places.state()).toBe('idle');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches the dataset from our own origin, with no query', async () => {
    await places.load();

    // Same-origin, static, no parameters. Nothing about the person is in it.
    expect(fetch).toHaveBeenCalledWith('/data/cities.json');
    expect(places.state()).toBe('ready');
    expect(places.size()).toBe(5);
  });

  it('fetches once however many times it is asked', async () => {
    await Promise.all([places.load(), places.load(), places.load()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('finds a city by prefix once loaded', async () => {
    await places.load();

    const found = places.search('tbil');
    expect(found[0].label).toBe('Tbilisi');
    expect(found[0].country).toBe('Georgia');
    expect(found[0].latitude).toBe(41.6914);
  });

  it('is case and accent insensitive', async () => {
    await places.load();

    // Someone typing their own birthplace on an English keyboard should not have
    // to produce the diacritic to find it.
    expect(places.search('ASUNCION')[0].label).toBe('Asunción');
    expect(places.search('sao pau')[0].label).toBe('São Paulo');
    expect(places.search('bodo')[0].label).toBe('Bodø');
  });

  it('returns nothing before the dataset arrives', () => {
    expect(places.search('tbilisi')).toEqual([]);
  });

  it('returns nothing for a query too short to be meaningful', async () => {
    await places.load();
    expect(places.search('')).toEqual([]);
    expect(places.search('t')).toEqual([]);
  });

  it('caps the result count', async () => {
    await places.load();
    expect(places.search('a', 2).length).toBeLessThanOrEqual(2);
  });

  it('exposes the attribution it read from the artefact', async () => {
    await places.load();
    expect(places.attribution()?.['licence']).toBe('CC BY 4.0');
  });

  it('fails recoverably rather than throwing, so the manual entry still works', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const failing = TestBed.inject(PlaceLookupService);

    await failing.load();

    expect(failing.state()).toBe('failed');
    expect(failing.search('tbilisi')).toEqual([]);
  });

  it('carries no time zone on the Place type it hands out', async () => {
    await places.load();

    const place: Place = places.search('tbilisi')[0];

    // The type has no such field, so this is a runtime confirmation that nothing
    // is smuggled through at the edges of the type system.
    expect('timeZoneId' in place).toBe(false);
    expect('utcOffset' in place).toBe(false);
    expect(Object.keys(place).sort()).toEqual([
      'country',
      'elevation',
      'label',
      'latitude',
      'longitude',
    ]);
  });
});
