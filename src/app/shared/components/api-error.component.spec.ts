import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ApiFailure } from '@core/models/api-error';

import { ApiErrorComponent } from './api-error.component';

import bundle from '../../../../public/i18n/content/en.json';

const failure = (over: Partial<ApiFailure>): ApiFailure => ({
  code: 'UNKNOWN',
  status: 400,
  detail: null,
  validationErrors: null,
  retryAfterSeconds: null,
  ...over,
});

@Component({
  standalone: true,
  imports: [ApiErrorComponent],
  template: `<sc-api-error [failure]="failure()" [retryable]="retryable()" />`,
})
class Host {
  // Signals, so a reassignment mid-test actually repaints. See the note in
  // chart-section.component.spec.ts.
  readonly failure = signal<ApiFailure>(failure({}));
  readonly retryable = signal(true);
}

describe('sc-api-error', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(TranslateService).setTranslation('en', bundle as unknown as TranslationObject);
    TestBed.inject(TranslateService).use('en');
    fixture = TestBed.createComponent(Host);
  });

  const text = () => fixture.nativeElement.textContent as string;

  it('says the specific thing for BEAD_CATALOG_EMPTY', () => {
    fixture.componentInstance.failure.set(failure({ code: 'BEAD_CATALOG_EMPTY' }));
    fixture.detectChanges();

    // Not "something went wrong". The code exists so the screen can explain that
    // this is not a fault — no beads are stocked yet.
    expect(text()).toContain('No beads are stocked yet');
    expect(text()).not.toContain('Something unexpected');
  });

  it('says something different for GEOMETRY_QUANTISATION', () => {
    fixture.componentInstance.failure.set(failure({ code: 'GEOMETRY_QUANTISATION' }));
    fixture.detectChanges();

    // Actionable, and specifically actionable: a different bead size fixes it.
    expect(text()).toContain('different bead size');
  });

  it('renders the reason key path for no code, never a raw dot path on screen', () => {
    fixture.componentInstance.failure.set(failure({ code: 'MATERIAL_FORBIDDEN_ON_SAFETY' }));
    fixture.detectChanges();

    expect(text()).not.toContain('STONECRAFT.ERRORS');
    expect(text()).toContain('unsafe for skin contact');
  });

  it('never renders the backend detail string', () => {
    // detail is operator prose and can quote request content — which on this API
    // can be birth data.
    fixture.componentInstance.failure.set(
      failure({
        code: 'SERVER_ERROR',
        status: 500,
        detail: 'Npgsql exception near born_at 1990-05-14T07:20',
      }),
    );
    fixture.detectChanges();

    expect(text()).not.toContain('1990-05-14');
    expect(text()).not.toContain('Npgsql');
  });

  it('offers a retry on a network failure', () => {
    fixture.componentInstance.failure.set(failure({ code: 'NETWORK_UNREACHABLE', status: 0 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('offers no retry on a refusal the backend meant', () => {
    // Retrying an identical request that the backend deliberately refused just
    // produces the same refusal, and a retry button implies otherwise.
    fixture.componentInstance.failure.set(failure({ code: 'GEM_SESSION_NOT_FOUND', status: 404 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('lists the per-field validation messages', () => {
    fixture.componentInstance.failure.set(
      failure({
        code: 'VALIDATION_FAILED',
        validationErrors: { 'BirthInput.Latitude': ['Latitude must be between -90 and 90.'] },
      }),
    );
    fixture.detectChanges();

    expect(text()).toContain('Latitude must be between -90 and 90.');
  });

  it('is announced to assistive technology', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
