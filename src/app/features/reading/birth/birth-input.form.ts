import type { BirthInput } from '@core/models/gemstones.models';

import type { Place } from './place-lookup.service';

/**
 * Turning what a person typed into what the backend accepts, and saying no when
 * it cannot be done.
 *
 * Kept out of the component because it is the part with rules in it, and rules
 * are worth testing without a DOM. The validation mirrors
 * `CreateSessionValidator` on the backend — not to avoid the round trip, but so
 * that an obviously-wrong date is answered immediately instead of by a 400. The
 * backend still validates; this never becomes the only check.
 */

/** The earliest date the ephemeris covers. Backend: `EarliestBirth = 1800-01-01`. */
export const EARLIEST_BIRTH_DATE = '1800-01-01';

export interface BirthFormValue {
  /** `YYYY-MM-DD` from a native date input. */
  localDate: string;
  /** `HH:mm` from a native time input. Ignored entirely when `timeUnknown`. */
  localTime: string;
  /**
   * The person said they do not know their birth time.
   *
   * A first-class answer, not a validation failure. It produces a degraded
   * reading that says what it could not tell them; substituting noon would
   * produce a confident, wrong one.
   */
  timeUnknown: boolean;
  /** A place chosen from the lookup, or null when coordinates were typed directly. */
  place: Place | null;
  /** Manual entry, used only when `place` is null. Strings because they come from inputs. */
  latitude: string;
  longitude: string;
}

export type BirthFieldError =
  | 'DATE_REQUIRED'
  | 'DATE_TOO_EARLY'
  | 'DATE_IN_FUTURE'
  | 'TIME_REQUIRED'
  | 'PLACE_REQUIRED'
  | 'LATITUDE_RANGE'
  | 'LONGITUDE_RANGE';

export type BirthErrors = Partial<Record<'date' | 'time' | 'place', BirthFieldError>>;

export const emptyBirthForm = (): BirthFormValue => ({
  localDate: '',
  localTime: '',
  timeUnknown: false,
  place: null,
  latitude: '',
  longitude: '',
});

/**
 * Validates, and returns nothing when there is nothing wrong.
 *
 * `today` is a parameter rather than a `new Date()` call so the future-date rule
 * is testable, and because a date rule that reads the clock is a rule that
 * changes behaviour at midnight in whichever timezone the test runner is in.
 */
export function validateBirthForm(value: BirthFormValue, today: Date): BirthErrors {
  const errors: BirthErrors = {};

  if (!value.localDate) {
    errors.date = 'DATE_REQUIRED';
  } else if (value.localDate < EARLIEST_BIRTH_DATE) {
    errors.date = 'DATE_TOO_EARLY';
  } else if (value.localDate > isoDate(today)) {
    // Not a backend rule, and worth having anyway: an ephemeris will happily
    // compute a chart for 2087, and nobody born then is filling in this form.
    errors.date = 'DATE_IN_FUTURE';
  }

  if (!value.timeUnknown && !value.localTime) {
    // Only when they have not said the time is unknown. Saying so is an answer.
    errors.time = 'TIME_REQUIRED';
  }

  if (value.place === null) {
    const latitude = Number(value.latitude);
    const longitude = Number(value.longitude);

    if (value.latitude === '' || value.longitude === '') {
      errors.place = 'PLACE_REQUIRED';
    } else if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      errors.place = 'LATITUDE_RANGE';
    } else if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      errors.place = 'LONGITUDE_RANGE';
    }
  }

  return errors;
}

export const isValidBirthForm = (value: BirthFormValue, today: Date): boolean =>
  Object.keys(validateBirthForm(value, today)).length === 0;

/**
 * Builds the request body. Only ever called on a validated form.
 *
 * Three things this must get right, and the second is the one that silently
 * ruins a chart.
 *
 * <b>`localTime` is null when the time is unknown</b> — not `'00:00'`, not
 * omitted, not the empty string. Null is what makes the backend suppress houses,
 * angles and the chart ruler instead of computing them from a fiction.
 *
 * <b>`timeZoneId` and `utcOffsetHours` are ALWAYS null.</b> Not "null when we
 * don't have one" — always. The place dataset carries no zone by construction
 * (see {@link Place} and `tools/build-city-data.mjs`), because the offset it
 * used to carry was a standard offset with no DST and no history: it says
 * Georgia is +4, and Georgia was on +5 in May 1990. `UtcOffsetHours` is
 * documented as a fallback used only when no zone resolves, so a wrong value
 * there is a wrong value nothing downstream can correct — an hour at 01:30 moves
 * the Ascendant about 15°, changing the rising sign, the chart ruler and every
 * stone under it. Null routes resolution through the IANA database from the
 * coordinates, which is DST-aware and historically correct.
 *
 * <b>`elevation` is 0 when unknown</b>, which is the contract's own default for
 * "not specified" — `BirthInput.Elevation` is a non-nullable double. The dataset
 * distinguishes unknown (null) from sea level; the wire format cannot, so the
 * distinction is preserved as far as it can be and collapsed here.
 */
export function toBirthInput(value: BirthFormValue): BirthInput {
  const place = value.place;

  return {
    localDate: value.localDate,
    localTime: value.timeUnknown ? null : normaliseTime(value.localTime),
    latitude: place?.latitude ?? Number(value.latitude),
    longitude: place?.longitude ?? Number(value.longitude),
    elevation: place?.elevation ?? 0,

    // Always null. See the note above — this is a control, not a default.
    timeZoneId: null,
    utcOffsetHours: null,
  };
}

/** A native time input gives `HH:mm`; the backend parses a `TimeOnly`, which takes seconds. */
function normaliseTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function isoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
