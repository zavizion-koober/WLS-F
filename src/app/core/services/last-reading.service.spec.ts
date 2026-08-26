import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LastReadingService, LAST_READING_KEY } from './last-reading.service';

/**
 * Remembering which reading is yours, so it survives closing the tab.
 *
 * A reading is anonymous. It is tied to an `sc_anon` HttpOnly cookie the API
 * issues, and the only handle the person has on it is the `publicId` in the URL.
 * Close the tab and that handle is gone — the reading still exists, and they can
 * never reach it again. So the id is kept on their own device.
 *
 * <b>The id, and nothing else.</b> `publicId` is opaque and carries nothing; it
 * is already in the address bar, and localStorage on someone's own machine is a
 * strictly smaller exposure than a URL that lands in history and referrer
 * headers. Birth data is a different matter entirely and must never be written
 * here — a test below spells that out, because "just cache the form so they
 * don't retype it" is the obvious next idea and it is the one thing this must
 * never do.
 */
describe('LastReadingService', () => {
  let service: LastReadingService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LastReadingService);
  });

  it('has nothing to offer before a reading exists', () => {
    expect(service.publicId()).toBeNull();
  });

  it('remembers a reading so it survives the tab closing', () => {
    service.remember('fdc0bbe0-2986-4e19-a327-41c1f79f5a11');

    expect(service.publicId()).toBe('fdc0bbe0-2986-4e19-a327-41c1f79f5a11');
    expect(localStorage.getItem(LAST_READING_KEY)).toBe('fdc0bbe0-2986-4e19-a327-41c1f79f5a11');
  });

  it('keeps only the newest, because only one reading is "yours" at a time', () => {
    service.remember('11111111-1111-4111-8111-111111111111');
    service.remember('22222222-2222-4222-8222-222222222222');

    expect(service.publicId()).toBe('22222222-2222-4222-8222-222222222222');
  });

  it('forgets on request, so a 404 can clear a reading that is gone', () => {
    service.remember('33333333-3333-4333-8333-333333333333');
    service.forget();

    expect(service.publicId()).toBeNull();
    expect(localStorage.getItem(LAST_READING_KEY)).toBeNull();
  });

  /**
   * The whole point of the guard. A caller that passes something structured —
   * a stringified form, a date, a place — is doing the thing this must never do,
   * and it fails loudly rather than writing it.
   */
  it.each([
    '1990-05-14',
    '07:20:00',
    '{"localDate":"1990-05-14"}',
    'Tbilisi',
    '41.7151,44.8271',
  ])('refuses to store %s, which is not an opaque id', (value) => {
    expect(() => service.remember(value)).toThrow(/opaque/i);
    expect(localStorage.getItem(LAST_READING_KEY)).toBeNull();
  });

  it('stores nothing but the id, so there is no birth data to leak', () => {
    service.remember('fdc0bbe0-2986-4e19-a327-41c1f79f5a11');

    const written = Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? '');
    expect(written).toEqual(['fdc0bbe0-2986-4e19-a327-41c1f79f5a11']);
  });
});
