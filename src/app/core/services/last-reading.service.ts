import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

/** Where the id lives. Named so a test can assert on the storage itself. */
export const LAST_READING_KEY = 'stonecraft.lastReading';

/**
 * A reading's `publicId` is opaque: a v4 UUID and nothing else. Anything with
 * structure — a date, a time, coordinates, a place name, a JSON blob — is by
 * definition not one, and is refused rather than written.
 */
const OPAQUE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Remembers which reading belongs to the person at this browser.
 *
 * A reading is anonymous. It is tied to an `sc_anon` HttpOnly cookie the API
 * issues, and the only handle the person has on it is the `publicId` in the URL.
 * Close the tab and that handle is gone: the reading still exists, the cookie
 * still proves ownership, and there is no screen that lists it. Without this the
 * whole flow works exactly once per sitting, and a saved bracelet design becomes
 * unreachable the moment someone navigates away.
 *
 * <b>The id, and nothing else, ever.</b> `publicId` carries nothing and is
 * already in the address bar; keeping it on someone's own device is a strictly
 * smaller exposure than a URL that lands in history, in referrer headers and in
 * pasted links. Birth data is a different matter and must never be written here.
 * "Cache the form so they don't have to retype it" is the obvious next idea and
 * it is precisely the thing this must not do — so `remember` throws on anything
 * that is not a bare UUID rather than trusting the caller.
 *
 * SSR-safe: on the server there is no `localStorage`, and a reading is a
 * per-device fact, so the server has nothing to say about it.
 */
@Injectable({ providedIn: 'root' })
export class LastReadingService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly stored = signal<string | null>(this.read());

  /** The last reading started on this device, or null. */
  readonly publicId = computed(() => this.stored());

  /** True when there is a reading to go back to. */
  readonly hasReading = computed(() => this.stored() !== null);

  remember(publicId: string): void {
    if (!OPAQUE_ID.test(publicId)) {
      throw new Error(
        `Refusing to store "${publicId}": only an opaque reading id may be kept here. ` +
          'Birth data never goes to storage.',
      );
    }

    this.stored.set(publicId);

    if (this.isBrowser) {
      localStorage.setItem(LAST_READING_KEY, publicId);
    }
  }

  /** Drops the id — for a reading that 404s, which means gone, not yours, or expired. */
  forget(): void {
    this.stored.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(LAST_READING_KEY);
    }
  }

  private read(): string | null {
    if (!this.isBrowser) {
      return null;
    }

    const value = localStorage.getItem(LAST_READING_KEY);
    // A value that is not an opaque id was not written by this service. Discard
    // rather than hand it on: the only ways it got there are a rename and
    // tampering, and neither should route anybody anywhere.
    return value !== null && OPAQUE_ID.test(value) ? value : null;
  }
}
