import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';

import bundle from '../../../../../public/i18n/content/en.json';
import { recommendation, sharedRecommendation } from '../reading-fixtures';

import { RecommendationsSectionComponent } from './recommendations-section.component';
import { StoneCardComponent } from './stone-card.component';

type AnyRec = CustomerRecommendation | SharedRecommendation;

@Component({
  standalone: true,
  imports: [RecommendationsSectionComponent],
  template: `<sc-recommendations-section [recommendations]="items()" />`,
})
class ListHost {
  readonly items = signal<readonly AnyRec[]>([]);
}

@Component({
  standalone: true,
  imports: [StoneCardComponent],
  template: `<sc-stone-card [stone]="stone()" />`,
})
class CardHost {
  readonly stone = signal<AnyRec>(recommendation());
}

function configure() {
  TestBed.configureTestingModule({
    imports: [TranslateModule.forRoot()],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('en', bundle as unknown as TranslationObject);
  translate.use('en');
}

describe('sc-recommendations-section', () => {
  let fixture: ComponentFixture<ListHost>;

  beforeEach(() => {
    configure();
    fixture = TestBed.createComponent(ListHost);
  });

  const text = () => fixture.nativeElement.textContent as string;
  const slugs = () =>
    [...fixture.nativeElement.querySelectorAll('[data-slug]')].map(
      (el) => (el as HTMLElement).dataset['slug'],
    );

  it('renders tier headings in the backend order', () => {
    fixture.componentInstance.items.set([
      recommendation({ materialSlug: 'onyx', tier: 'Supportive' }),
      recommendation({ materialSlug: 'emerald', tier: 'Primary' }),
      recommendation({ materialSlug: 'agate', tier: 'Secondary' }),
    ]);
    fixture.detectChanges();

    // h3 is the tier level: h2 section, h3 tier, h4 card title.
    const headings = [...fixture.nativeElement.querySelectorAll('h3')].map((h) =>
      (h as HTMLElement).textContent?.trim(),
    );
    expect(headings).toEqual(['Primary', 'Secondary', 'Supportive']);
  });

  it('places each stone under its own tier', () => {
    fixture.componentInstance.items.set([
      recommendation({ materialSlug: 'onyx', tier: 'Supportive' }),
      recommendation({ materialSlug: 'emerald', tier: 'Primary' }),
      recommendation({ materialSlug: 'jade', tier: 'Primary' }),
    ]);
    fixture.detectChanges();

    // Primary first, and within Primary the backend's order is preserved — it
    // ranked by score against evidence, and re-sorting would replace that with
    // an ordering the UI invented.
    expect(slugs()).toEqual(['emerald', 'jade', 'onyx']);
  });

  it('renders no heading for a tier with nothing in it', () => {
    fixture.componentInstance.items.set([recommendation({ tier: 'Primary' })]);
    fixture.detectChanges();

    expect(text()).toContain('Primary');
    expect(text()).not.toContain('Supportive');
  });

  it('does not render a Caution group', () => {
    // Cautions are a separate list on the response and their own section. Not a
    // fourth rank below Supportive.
    fixture.componentInstance.items.set([
      recommendation({ materialSlug: 'malachite', tier: 'Caution' }),
      recommendation({ materialSlug: 'emerald', tier: 'Primary' }),
    ]);
    fixture.detectChanges();

    expect(slugs()).toEqual(['emerald']);
  });

  it('shows an honest empty state rather than a blank page', () => {
    fixture.componentInstance.items.set([]);
    fixture.detectChanges();

    expect(text()).toContain('No stones ranked');
    expect(text()).toContain('birth time');
  });

  it('renders no raw translation keys', () => {
    fixture.componentInstance.items.set([recommendation()]);
    fixture.detectChanges();
    expect(text()).not.toContain('STONECRAFT.');
  });
});

describe('sc-stone-card', () => {
  let fixture: ComponentFixture<CardHost>;

  beforeEach(() => {
    configure();
    fixture = TestBed.createComponent(CardHost);
  });

  const text = () => fixture.nativeElement.textContent as string;
  const query = (s: string) => fixture.nativeElement.querySelector(s);

  it('shows the short reason on the card and hides the long one', () => {
    fixture.detectChanges();

    // short: a label, no sentence-ending period.
    expect(text()).toContain('Your Sun is in Taurus');
    // long: one or two sentences, behind the disclosure.
    expect(text()).not.toContain('the sign the Sun occupied at your birth');
  });

  it('reveals the long reason and the tradition on discover more', () => {
    fixture.detectChanges();
    query('button[aria-expanded]').click();
    fixture.detectChanges();

    expect(text()).toContain('the sign the Sun occupied at your birth');
    // The tradition is what keeps the sentence a claim about a tradition rather
    // than a claim about the world. It must appear with the long form.
    expect(text()).toContain('western magical tradition');
  });

  it('reports corroboration in the backend own terms', () => {
    fixture.detectChanges();
    expect(text()).toContain('2 traditions agree');

    fixture.componentInstance.stone.set(recommendation({ independentSourceCount: 1 }));
    fixture.detectChanges();
    expect(text()).toContain('One tradition');
  });

  it('describes the confidence band as being about the source, not the world', () => {
    fixture.componentInstance.stone.set(recommendation({ confidenceBand: 'HeavilyHedged' }));
    fixture.detectChanges();

    expect(text()).toContain('Contested or heavily hedged');
    expect(query('[title]').getAttribute('title')).toContain('how firmly the tradition states');
  });

  it('never renders a cautioned stone without its warning', () => {
    // The load-bearing assertion. A caution one click away is a caution not shown.
    fixture.componentInstance.stone.set(
      recommendation({
        isCautioned: true,
        cautions: [{ reasonKey: 'reason.caution.pavitt.taurus' }],
      }),
    );
    fixture.detectChanges();

    const notice = query('[data-testid="caution-notice"]');
    expect(notice).not.toBeNull();
    expect(text()).toContain('Counselled against');

    // And it is visible without expanding.
    expect(query('button[aria-expanded]').getAttribute('aria-expanded')).toBe('false');
    expect(notice.textContent.trim().length).toBeGreaterThan(0);
  });

  it('reads the caution keys out of the shared projection shape too', () => {
    // Owner: cautions[{reasonKey}]. Shared: cautionReasonKeys[]. A card that
    // assumed one shape would render no warning on the other — on the more
    // public of the two surfaces.
    fixture.componentInstance.stone.set(
      sharedRecommendation({
        isCautioned: true,
        cautionReasonKeys: ['reason.caution.pavitt.taurus'],
      }),
    );
    fixture.detectChanges();

    expect(query('[data-testid="caution-notice"]')).not.toBeNull();
  });

  it('shows no caution block on an uncautioned stone', () => {
    fixture.detectChanges();
    expect(query('[data-testid="caution-notice"]')).toBeNull();
  });

  it('never renders a price', () => {
    // There is no price in this backend to show, and no field that could carry
    // one. Asserted because "no prices anywhere" is easier to keep than to regain.
    fixture.detectChanges();
    expect(text()).not.toMatch(/[$€£₾]|\bprice\b|\bcost\b/i);
  });

  it('never renders a source, an author or a locator', () => {
    // D16 is a property of the responses, and this asserts the UI does not
    // reintroduce one by assembling a string.
    fixture.detectChanges();
    query('button[aria-expanded]').click();
    fixture.detectChanges();

    for (const forbidden of ['cunningham', 'pavitt', 'hickey', 'raphaell', 'p.', 'ch.']) {
      expect(text().toLowerCase()).not.toContain(forbidden);
    }
  });
});
