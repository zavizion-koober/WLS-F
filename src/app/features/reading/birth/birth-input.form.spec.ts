import { describe, expect, it } from 'vitest';

import {
  emptyBirthForm,
  toBirthInput,
  validateBirthForm,
  type BirthFormValue,
} from './birth-input.form';
import type { Place } from './place-lookup.service';

const TBILISI: Place = {
  label: 'Tbilisi',
  country: 'Georgia',
  latitude: 41.6914,
  longitude: 44.8341,
  elevation: 433,
};

const TODAY = new Date(2026, 7, 20);

const form = (over: Partial<BirthFormValue> = {}): BirthFormValue => ({
  ...emptyBirthForm(),
  localDate: '1990-05-14',
  localTime: '07:20',
  place: TBILISI,
  ...over,
});

describe('birth form validation', () => {
  it('accepts a complete form', () => {
    expect(validateBirthForm(form(), TODAY)).toEqual({});
  });

  it('requires a date', () => {
    expect(validateBirthForm(form({ localDate: '' }), TODAY).date).toBe('DATE_REQUIRED');
  });

  it('rejects a date before the ephemeris range', () => {
    // Mirrors the backend's EarliestBirth. Checked here so an obviously-wrong
    // date is answered immediately rather than by a 400, not so the backend can
    // stop checking.
    expect(validateBirthForm(form({ localDate: '1799-12-31' }), TODAY).date).toBe('DATE_TOO_EARLY');
    expect(validateBirthForm(form({ localDate: '1800-01-01' }), TODAY).date).toBeUndefined();
  });

  it('rejects a future date', () => {
    expect(validateBirthForm(form({ localDate: '2026-08-21' }), TODAY).date).toBe('DATE_IN_FUTURE');
    expect(validateBirthForm(form({ localDate: '2026-08-20' }), TODAY).date).toBeUndefined();
  });

  it('requires a time unless the person says they do not know it', () => {
    expect(validateBirthForm(form({ localTime: '' }), TODAY).time).toBe('TIME_REQUIRED');

    // Saying "I don't know" is an answer, not an omission.
    expect(
      validateBirthForm(form({ localTime: '', timeUnknown: true }), TODAY).time,
    ).toBeUndefined();
  });

  it('requires a place, or coordinates', () => {
    expect(validateBirthForm(form({ place: null }), TODAY).place).toBe('PLACE_REQUIRED');

    expect(
      validateBirthForm(form({ place: null, latitude: '41.7', longitude: '44.8' }), TODAY).place,
    ).toBeUndefined();
  });

  it.each([
    ['91', '0', 'LATITUDE_RANGE'],
    ['-91', '0', 'LATITUDE_RANGE'],
    ['0', '181', 'LONGITUDE_RANGE'],
    ['0', '-181', 'LONGITUDE_RANGE'],
    ['abc', '0', 'LATITUDE_RANGE'],
  ])('rejects coordinates (%s, %s)', (latitude, longitude, code) => {
    expect(validateBirthForm(form({ place: null, latitude, longitude }), TODAY).place).toBe(code);
  });

  it('accepts zero coordinates', () => {
    // Null Island is a valid point and a truthiness check would reject it.
    expect(
      validateBirthForm(form({ place: null, latitude: '0', longitude: '0' }), TODAY).place,
    ).toBeUndefined();
  });
});

describe('building the request body', () => {
  it('sends the chosen place coordinates and its elevation', () => {
    const input = toBirthInput(form());

    expect(input.latitude).toBe(41.6914);
    expect(input.longitude).toBe(44.8341);
    expect(input.elevation).toBe(433);
  });

  /**
   * <b>The assertion that protects the chart.</b>
   *
   * The upstream place data carries a standard UTC offset with no DST and no
   * history — it says Georgia is +4. Georgia was on +5 in May 1990, because the
   * USSR moved to summer time on 25 March that year. `BirthInput.UtcOffsetHours`
   * is a fallback used only when no zone resolves, so a wrong hour there is a
   * wrong hour nothing downstream can correct, and one hour at 01:30 moves the
   * Ascendant about 15° — changing the rising sign, the chart ruler, and every
   * stone ranked beneath it.
   *
   * Both fields therefore go null ALWAYS, so the backend resolves the zone from
   * the coordinates through the IANA database, which is DST-aware and
   * historically correct. The `Place` type has no zone field to send, and this
   * asserts the outcome as well as the shape.
   */
  it.each([
    ['a chosen place', form()],
    ['manual coordinates', form({ place: null, latitude: '41.6', longitude: '41.6' })],
    ['an unknown birth time', form({ timeUnknown: true })],
  ])('never populates timeZoneId or utcOffsetHours from %s', (_case, value) => {
    const input = toBirthInput(value);

    expect(input.timeZoneId).toBeNull();
    expect(input.utcOffsetHours).toBeNull();
  });

  it('carries no offset on the Place type it is built from', () => {
    expect('utcOffset' in TBILISI).toBe(false);
    expect('timeZoneId' in TBILISI).toBe(false);
  });

  it('ignores an offset even if one is smuggled onto a place object', () => {
    // The type has no such field and the dataset carries no such column, so this
    // cannot happen through the front door. It is asserted anyway because the
    // two guards it would have to get past are both about SHAPE — a build script
    // and a TypeScript interface — and neither survives a cast. This one is
    // about behaviour, and behaviour is what reaches the chart.
    const smuggled = {
      ...TBILISI,
      utcOffset: 4,
      timeZoneId: 'Asia/Tbilisi',
    } as unknown as Place;

    const input = toBirthInput(form({ place: smuggled }));

    expect(input.utcOffsetHours).toBeNull();
    expect(input.timeZoneId).toBeNull();

    // And nothing about it reached the body at all.
    expect(JSON.stringify(input)).not.toContain('Tbilisi');
    expect(Object.keys(input).sort()).toEqual([
      'elevation',
      'latitude',
      'localDate',
      'localTime',
      'longitude',
      'timeZoneId',
      'utcOffsetHours',
    ]);
  });

  it('sends localTime as null when the birth time is unknown', () => {
    // The load-bearing assertion in this file. Null is what makes the backend
    // suppress houses, angles and the chart ruler. '00:00' would produce a
    // confident, wrong reading, and an empty string would fail to parse into a
    // TimeOnly, which is a different bug wearing the same shirt.
    const input = toBirthInput(form({ timeUnknown: true, localTime: '07:20' }));

    expect(input.localTime).toBeNull();
  });

  it('pads a HH:mm time to seconds for TimeOnly', () => {
    expect(toBirthInput(form({ localTime: '07:20' })).localTime).toBe('07:20:00');
    expect(toBirthInput(form({ localTime: '07:20:35' })).localTime).toBe('07:20:35');
  });

  it('reads coordinates from the manual fields when no place is chosen', () => {
    const input = toBirthInput(form({ place: null, latitude: '41.7', longitude: '44.8' }));

    expect(input.latitude).toBe(41.7);
    expect(input.longitude).toBe(44.8);
  });

  it('sends 0 for an unknown elevation, which is the contract default', () => {
    // The dataset distinguishes unknown (null) from sea level (0). BirthInput's
    // Elevation is a non-nullable double, so the distinction is preserved as far
    // as it can be and collapsed here rather than earlier.
    expect(toBirthInput(form({ place: { ...TBILISI, elevation: null } })).elevation).toBe(0);
    expect(toBirthInput(form({ place: null, latitude: '0', longitude: '0' })).elevation).toBe(0);
  });
});
