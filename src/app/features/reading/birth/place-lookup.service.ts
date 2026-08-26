import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

/**
 * A place of birth, resolved to what the backend actually needs.
 *
 * <b>There is deliberately no time zone on this type, and no UTC offset.</b>
 * That is not an omission to be filled in later — it is the control. See
 * {@link PlaceLookupService} and `tools/build-city-data.mjs`. A field that does
 * not exist cannot be sent by accident, and this one, sent by accident, silently
 * produces a wrong chart.
 */
export interface Place {
  /** What the person sees and types against. Never sent anywhere. */
  label: string;
  /** Full country name, as the dataset carries it. For disambiguating duplicates. */
  country: string;
  latitude: number;
  longitude: number;
  /** Metres. **Null means unknown**, which is not the same as sea level. */
  elevation: number | null;
}

/** The on-disk shape: `[city, lat, lon, elevation]`, grouped by country. */
type CityTuple = [string, number, number, number | null];

interface CityFile {
  _attribution: Record<string, string>;
  countries: Record<string, CityTuple[]>;
}

export type PlaceLoadState = 'idle' | 'loading' | 'ready' | 'failed';

/**
 * Resolves a typed place to coordinates, entirely offline.
 *
 * ── IT NEVER MAKES A THIRD-PARTY REQUEST ────────────────────────────────────
 *
 * Place of birth is one leg of the date + time + place triple this system treats
 * as near-identifying: never logged by the backend, never put in a URL, never
 * routed through our own SSR server. Sending it to a geocoding API to look up a
 * latitude would hand that leg — along with an IP and a timestamp — to someone
 * outside the system entirely, which contradicts every other decision made about
 * it. The name never leaves the browser; only the resulting numbers do, inside
 * the one POST that was always going to carry them.
 *
 * The one request this makes is to our own origin, for a static asset, and it
 * carries no query.
 *
 * ── NO TIME ZONE, BY CONSTRUCTION ───────────────────────────────────────────
 *
 * The upstream dataset carries a `utcOffset` column. It is a **standard** offset
 * with no DST and no history — 4 for Georgia — and `BirthInput.UtcOffsetHours`
 * is a fallback used only when no zone resolves, so populating it from that
 * column would substitute a wrong hour exactly where nothing can correct it.
 * Georgia was on +5 in May 1990, not +4; one hour at 01:30 moves the Ascendant
 * about 15°, which changes the rising sign, the chart ruler, and every stone
 * below it.
 *
 * So the column is dropped at build time and the field is absent from
 * {@link Place}. `timeZoneId` and `utcOffsetHours` go to the backend null, which
 * routes resolution through the IANA database — historically correct and
 * DST-aware.
 *
 * ── LAZY ────────────────────────────────────────────────────────────────────
 *
 * ~1.1 MB is a lot for a form field, so it is fetched on demand rather than
 * bundled, and only the birth form asks for it.
 */
@Injectable({ providedIn: 'root' })
export class PlaceLookupService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  private readonly places = signal<readonly Place[]>([]);
  private readonly loadState = signal<PlaceLoadState>('idle');

  private inFlight: Promise<void> | null = null;

  readonly state = this.loadState.asReadonly();
  readonly size = computed(() => this.places().length);

  /** Attribution, read from the artefact so it cannot drift from the data. */
  private readonly attributionSignal = signal<Record<string, string> | null>(null);
  readonly attribution = this.attributionSignal.asReadonly();

  /**
   * Fetches the dataset once. Safe to call repeatedly and on every keystroke.
   *
   * A no-op on the server: the birth form is client-rendered precisely so that
   * nothing about this flow touches our node process.
   */
  load(): Promise<void> {
    if (this.inFlight !== null) {
      return this.inFlight;
    }

    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    this.loadState.set('loading');

    this.inFlight = fetch('/data/cities.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`cities.json ${response.status}`);
        }
        return response.json() as Promise<CityFile>;
      })
      .then((file) => {
        this.places.set(flatten(file));
        this.attributionSignal.set(file._attribution ?? null);
        this.loadState.set('ready');
      })
      .catch(() => {
        // A failure here is recoverable rather than fatal: the form's manual
        // coordinate entry still works, and the UI says so. Retryable, so the
        // in-flight promise is cleared.
        this.inFlight = null;
        this.loadState.set('failed');
      });

    return this.inFlight;
  }

  /**
   * Matches on a normalised prefix, then on a normalised substring.
   *
   * Prefix first so typing "tbil" offers Tbilisi ahead of anything that merely
   * contains those letters, and accent-insensitive so "asuncion" finds
   * "Asunción" — a person typing their own birthplace on an English keyboard
   * should not have to produce the diacritic.
   */
  search(query: string, limit = 8): readonly Place[] {
    const needle = normalise(query);
    if (needle.length < 2) {
      return [];
    }

    const prefix: Place[] = [];
    const contains: Place[] = [];

    for (const place of this.places()) {
      const haystack = normalise(place.label);
      if (haystack.startsWith(needle)) {
        if (prefix.length < limit) prefix.push(place);
      } else if (contains.length < limit && haystack.includes(needle)) {
        contains.push(place);
      }
      if (prefix.length >= limit) break;
    }

    return [...prefix, ...contains].slice(0, limit);
  }
}

function flatten(file: CityFile): readonly Place[] {
  const out: Place[] = [];

  for (const [country, cities] of Object.entries(file.countries ?? {})) {
    for (const [label, latitude, longitude, elevation] of cities) {
      out.push({ label, country, latitude, longitude, elevation });
    }
  }

  return out;
}

/**
 * Letters that survive NFD because they are not a base plus a combining mark.
 *
 * `ø`, `ł`, `đ`, `ß` and the rest are distinct code points with nothing to
 * strip, so normalisation leaves them intact and a plain-ASCII query never
 * matches. Somebody born in Bodø typing "bodo" would find nothing, which is the
 * exact case an accent-insensitive search exists to serve.
 */
const TRANSLITERATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ø/g, 'o'],
  [/œ/g, 'oe'],
  [/æ/g, 'ae'],
  [/ł/g, 'l'],
  [/đ/g, 'd'],
  [/ð/g, 'd'],
  [/þ/g, 'th'],
  [/ß/g, 'ss'],
  [/ı/g, 'i'],
  [/ŀ/g, 'l'],
  [/ħ/g, 'h'],
  [/ŧ/g, 't'],
  [/ʻ|ʼ|’|'/g, ''],
];

/** Lowercase, diacritics stripped, non-decomposable letters transliterated. */
function normalise(value: string): string {
  let out = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

  for (const [pattern, replacement] of TRANSLITERATIONS) {
    out = out.replace(pattern, replacement);
  }

  return out;
}
