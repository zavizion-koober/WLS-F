import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { LastReadingService } from '@core/services/last-reading.service';

import bundle from '../../../../public/i18n/content/en.json';

import { CustomBraceletSectionComponent } from './custom-bracelet-section.component';

const OWNER_ID = 'fdc0bbe0-2986-4e19-a327-41c1f79f5a11';

@Component({
  standalone: true,
  imports: [CustomBraceletSectionComponent],
  template: `<app-custom-bracelet-section />`,
})
class Host {}

/**
 * The home page's introduction to the bracelet flow — and the app's only
 * entrance to it.
 *
 * Everything downstream of this section already worked and could not be reached:
 * the designer was live, seeded and solvable, with no link to it anywhere in the
 * shop. A feature nobody can find is a feature nobody has.
 */
describe('app-custom-bracelet-section', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', bundle as unknown as TranslationObject);
    translate.use('en');
  });

  const render = () => {
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
    return element;
  };

  const cta = () => element.querySelector<HTMLAnchorElement>('[data-testid="bracelet-cta"]')!;

  it('sends a first-time visitor to the birth form', () => {
    render();

    expect(cta().getAttribute('href')).toBe('/reading');
    expect(cta().textContent).toContain('Read my chart');
  });

  /**
   * A reading is anonymous and lives behind an HttpOnly cookie with no screen
   * that lists it. Without this, someone who read their chart yesterday is
   * invited to start again from an empty form, and the design they saved is
   * unreachable forever.
   */
  it('sends a returning visitor back to the reading they already have', () => {
    TestBed.runInInjectionContext(() => TestBed.inject(LastReadingService).remember(OWNER_ID));
    render();

    expect(cta().getAttribute('href')).toBe(`/reading/${OWNER_ID}`);
    expect(cta().textContent).toContain('Continue my reading');
  });

  it('says the bracelet is made to order, before anyone commits to anything', () => {
    render();

    expect(element.textContent).toContain('Nothing is taken from stock');
  });

  /**
   * The backend computes no price at all — a bracelet is quoted after the stones
   * are sourced. A number here would be invented, and an invented number on a
   * home page is a promise.
   */
  it('names no price', () => {
    render();

    expect(element.textContent ?? '').not.toMatch(/\p{Sc}/u);
    expect(element.textContent ?? '').not.toMatch(/\b(price|cost|total|GEL|USD|EUR)\b/i);
  });

  it('renders no raw translation keys', () => {
    render();

    expect(element.textContent).not.toContain('STONECRAFT.');
  });
});
