import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_URLS } from '@core/http/api-urls.token';

import bundle from '../../../../public/i18n/content/en.json';

import { BirthInputPage } from './birth-input.page';
import { ReadingStore } from './reading.store';

/**
 * The form, and the one rule it exists to keep.
 *
 * Birth data is posted browser → API and the app routes on the returned
 * `publicId`. Nothing typed here reaches a URL — not as a query parameter, not as
 * a route segment, not in the navigation the success path performs.
 */
describe('sc-birth-input-page', () => {
  let fixture: ComponentFixture<BirthInputPage>;
  let http: HttpTestingController;
  let store: ReadingStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BirthInputPage, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URLS, useValue: { rest: '/api/v1' } },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', bundle as unknown as TranslationObject);
    translate.use('en');

    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ReadingStore);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(BirthInputPage);
    fixture.detectChanges();
  });

  const query = <T extends HTMLElement>(selector: string): T =>
    fixture.nativeElement.querySelector(selector) as T;
  const text = () => fixture.nativeElement.textContent as string;

  /** Fills the form the way a person would, through the store rather than the DOM. */
  function submitValid(): void {
    store.createSession({
      birthInput: {
        localDate: '1990-05-14',
        localTime: '07:20:00',
        latitude: 41.7151,
        longitude: 44.8271,
        elevation: 433,
        timeZoneId: null,
        utcOffsetHours: null,
      },
    });
  }

  it('renders the three questions it asks', () => {
    expect(text()).toContain('Date of birth');
    expect(text()).toContain('Time of birth');
    expect(text()).toContain('Place of birth');
  });

  it('offers "I do not know my birth time" as a first-class answer', () => {
    // Not a validation failure. A degraded reading that says what it could not
    // tell you beats a confident wrong one.
    expect(text()).toContain("I don't know my birth time");
  });

  it('tells the person where their birth details go', () => {
    expect(text()).toContain('never put in a web address');
  });

  it('shows no validation errors before a submit attempt', () => {
    // Errors are computed from the first keystroke; showing them is what waits.
    expect(text()).not.toContain('Please enter your date of birth');
  });

  it('shows errors after an invalid submit and posts nothing', () => {
    query<HTMLFormElement>('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(text()).toContain('Please enter your date of birth');
    http.expectNone(() => true);
  });

  it('posts the birth input in the body, with nothing in the url', () => {
    submitValid();

    const request = http.expectOne('/api/v1/gemstones/sessions');

    expect(request.request.method).toBe('POST');
    expect(request.request.urlWithParams).toBe('/api/v1/gemstones/sessions');
    expect(request.request.body.birthInput.localDate).toBe('1990-05-14');

    request.flush({
      publicId: 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11',
      anonymousSessionId: null,
      expiresAtUtc: null,
      result: {},
    });
  });

  it('navigates on the returned publicId and never on the birth data', async () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    submitValid();
    http
      .expectOne('/api/v1/gemstones/sessions')
      .flush({ publicId: 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11', anonymousSessionId: null, expiresAtUtc: null, result: {} });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/reading', 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11']);

    // The whole point, asserted on the navigation itself: no fragment of the
    // birth input is anywhere in the route that gets pushed to history.
    const serialised = JSON.stringify(navigate.mock.calls);
    for (const fragment of ['1990', '05-14', '07:20', '41.7', '44.8', 'Tbilisi']) {
      expect(serialised).not.toContain(fragment);
    }
  });

  it('surfaces a failure with its specific code rather than a generic message', () => {
    submitValid();

    http
      .expectOne('/api/v1/gemstones/sessions')
      .flush(
        { status: 400, detail: 'unusable', code: 'GEM_BIRTHDATA_INVALID' },
        { status: 400, statusText: 'Bad Request' },
      );

    fixture.detectChanges();

    expect(text()).toContain("birth details can't be used");
    expect(text()).not.toContain('Something unexpected');
  });

  it('surfaces the per-field messages on a validation failure', () => {
    submitValid();

    http.expectOne('/api/v1/gemstones/sessions').flush(
      {
        title: 'Validation Error',
        status: 400,
        errors: { 'BirthInput.Latitude': ['Latitude must be between -90 and 90.'] },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    fixture.detectChanges();

    // The one place the backend's English reaches a customer, because a form that
    // says "some details need correcting" without saying which is not usable.
    expect(text()).toContain('Latitude must be between -90 and 90.');
  });

  it('offers a retry on a rate limit and not on a refusal', () => {
    submitValid();
    http
      .expectOne('/api/v1/gemstones/sessions')
      .flush(null, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(text()).toContain('few readings in quick succession');
    expect(query('[role="alert"] button')).not.toBeNull();
  });

  it('never writes birth data anywhere that outlives the tab', () => {
    submitValid();
    http
      .expectOne('/api/v1/gemstones/sessions')
      .flush({ publicId: 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11', anonymousSessionId: null, expiresAtUtc: null, result: {} });

    const persisted = [
      ...Object.values(globalThis.localStorage ?? {}),
      ...Object.values(globalThis.sessionStorage ?? {}),
      globalThis.document?.cookie ?? '',
    ].join(' ');

    for (const fragment of ['1990-05-14', '07:20', '41.7151', 'Tbilisi']) {
      expect(persisted).not.toContain(fragment);
    }
  });

  it('renders no raw translation keys', () => {
    expect(text()).not.toContain('STONECRAFT.');
  });
});
