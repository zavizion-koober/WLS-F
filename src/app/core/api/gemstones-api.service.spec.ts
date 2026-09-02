import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { API_URLS } from '@core/http/api-urls.token';
import { API_ERROR_CODES, type ApiErrorCode } from '@core/models/api-error';
import type { CreateSessionRequest } from '@core/models/gemstones.models';

import { BraceletsApiService } from './bracelets-api.service';
import { GemstonesApiService } from './gemstones-api.service';
import type { RequestState } from './request-state';

const BIRTH: CreateSessionRequest = {
  birthInput: {
    localDate: '1990-05-14',
    localTime: '07:20',
    latitude: 41.7151,
    longitude: 44.8271,
    elevation: 0,
    timeZoneId: 'Asia/Tbilisi',
    utcOffsetHours: null,
  },
};

describe('API layer state transitions', () => {
  let gemstones: GemstonesApiService;
  let bracelets: BraceletsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URLS, useValue: { rest: '/api' } },
      ],
    });
    gemstones = TestBed.inject(GemstonesApiService);
    bracelets = TestBed.inject(BraceletsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  /** Collects every state a call passes through, in order. */
  function record<T>(call: { subscribe: (fn: (s: RequestState<T>) => void) => unknown }) {
    const states: RequestState<T>[] = [];
    call.subscribe((s) => states.push(s));
    return states;
  }

  it('emits loading before success', () => {
    const states = record(gemstones.createSession(BIRTH));

    // loading arrives synchronously, before the request is even flushed. A
    // screen bound to this never renders an empty frame first.
    expect(states.map((s) => s.status)).toEqual(['loading']);

    http.expectOne('/api/gemstones/sessions').flush({ publicId: 'abc' });

    expect(states.map((s) => s.status)).toEqual(['loading', 'success']);
    expect(states[1]).toMatchObject({ status: 'success', value: { publicId: 'abc' } });
  });

  it('emits loading then error, and never throws out of the stream', () => {
    const states = record(gemstones.getSession('nope'));

    http
      .expectOne('/api/gemstones/sessions/nope')
      .flush(
        { status: 404, detail: 'Not found, not yours, or expired.', code: 'GEM_SESSION_NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(states.map((s) => s.status)).toEqual(['loading', 'error']);
    expect(states[1]).toMatchObject({
      status: 'error',
      failure: { code: 'GEM_SESSION_NOT_FOUND', status: 404 },
    });
  });

  /**
   * The point of the whole error contract: each code survives the round trip
   * intact. These are not interchangeable — "no beads are stocked" and "that
   * wrist cannot be strung" are different answers to different questions — and
   * collapsing them is exactly the regression this guards.
   */
  it.each([...API_ERROR_CODES])('preserves the backend code %s verbatim', (code) => {
    const states = record(bracelets.getSizing());

    http
      .expectOne('/api/bracelets/sizing')
      .flush({ status: 400, detail: 'refused', code }, { status: 400, statusText: 'Bad Request' });

    const last = states.at(-1);
    expect(last).toMatchObject({ status: 'error', failure: { code } });
    expect((last as { failure: { code: ApiErrorCode } }).failure.code).toBe(code);
  });

  it('maps an unreachable network to NETWORK_UNREACHABLE, not SERVER_ERROR', () => {
    const states = record(gemstones.listMaterials());

    // status 0: nothing arrived. Distinct from a 5xx, where a server answered
    // and failed — one is worth retrying immediately, the other is not.
    http
      .expectOne((r) => r.url === '/api/gemstones/materials')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(states.at(-1)).toMatchObject({
      status: 'error',
      failure: { code: 'NETWORK_UNREACHABLE', status: 0 },
    });
  });

  it('maps a 5xx with no code to SERVER_ERROR', () => {
    const states = record(gemstones.listMaterials());

    http
      .expectOne((r) => r.url === '/api/gemstones/materials')
      .flush(
        { status: 500, title: 'Internal Server Error', detail: 'An unexpected error occurred.' },
        { status: 500, statusText: 'Internal Server Error' },
      );

    expect(states.at(-1)).toMatchObject({
      status: 'error',
      failure: { code: 'SERVER_ERROR', status: 500 },
    });
  });

  it('reads Retry-After off a 429', () => {
    const states = record(gemstones.createSession(BIRTH));

    http.expectOne('/api/gemstones/sessions').flush(null, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: new HttpHeaders({ 'Retry-After': '30' }),
    });

    expect(states.at(-1)).toMatchObject({
      status: 'error',
      failure: { code: 'RATE_LIMITED', retryAfterSeconds: 30 },
    });
  });

  it('carries a ValidationProblemDetails bag through as VALIDATION_FAILED', () => {
    const states = record(gemstones.createSession(BIRTH));

    // FluentValidation's shape: per-property messages and no `code`.
    http.expectOne('/api/gemstones/sessions').flush(
      {
        title: 'Validation Error',
        status: 400,
        errors: {
          'BirthInput.Latitude': ['Latitude must be between -90 and 90.'],
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(states.at(-1)).toMatchObject({
      status: 'error',
      failure: {
        code: 'VALIDATION_FAILED',
        validationErrors: { 'BirthInput.Latitude': ['Latitude must be between -90 and 90.'] },
      },
    });
  });

  it('does not mistake an unrecognised code for a known one', () => {
    const states = record(gemstones.listMaterials());

    http
      .expectOne((r) => r.url === '/api/gemstones/materials')
      .flush(
        { status: 400, code: 'SOMETHING_NEW_THE_BACKEND_ADDED' },
        { status: 400, statusText: 'Bad Request' },
      );

    // Falls through to UNKNOWN rather than being passed along as a code the UI
    // has no copy for — which would render as a raw identifier on screen.
    expect(states.at(-1)).toMatchObject({ status: 'error', failure: { code: 'UNKNOWN' } });
  });

  describe('request shapes', () => {
    it('posts birth data in the body and puts nothing in the url', () => {
      gemstones.createSession(BIRTH).subscribe();

      const req: TestRequest = http.expectOne('/api/gemstones/sessions');
      expect(req.request.method).toBe('POST');
      expect(req.request.urlWithParams).toBe('/api/gemstones/sessions');
      expect(req.request.body).toEqual(BIRTH);
      req.flush({});
    });

    it('sends share as a query flag', () => {
      gemstones.setSessionShared('pid', true).subscribe();

      const req = http.expectOne((r) => r.url === '/api/gemstones/sessions/pid/share');
      expect(req.request.method).toBe('PUT');
      expect(req.request.params.get('share')).toBe('true');
      req.flush({});
    });

    it('keeps false and 0 in query params instead of dropping them', () => {
      gemstones.listMaterials({ isActive: false, page: 0 }).subscribe();

      const req = http.expectOne((r) => r.url === '/api/gemstones/materials');
      expect(req.request.params.get('isActive')).toBe('false');
      expect(req.request.params.get('page')).toBe('0');
      req.flush({
        items: [],
        page: 0,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
      });
    });

    it('omits undefined query params entirely', () => {
      gemstones.listMaterials({ tradition: undefined, planet: 'Venus' }).subscribe();

      const req = http.expectOne((r) => r.url === '/api/gemstones/materials');
      expect(req.request.params.has('tradition')).toBe(false);
      expect(req.request.params.get('planet')).toBe('Venus');
      req.flush({
        items: [],
        page: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
      });
    });

    it('has no handoff method — the backend route is deliberately absent', () => {
      // D14: IBraceletHandoff is not routed, and a backend test asserts three
      // plausible spellings all 404 so nobody answers the transport question by
      // accident. Adding a client method would answer it from this side.
      expect('handoff' in bracelets).toBe(false);
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(bracelets))).not.toContain('handoff');
    });
  });

  it('has nothing left un-flushed', () => {
    http.verify();
    expect(HttpErrorResponse).toBeDefined();
  });
});
