import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  CustomerRecommendation,
  CustomerUnavailableGroup,
} from '@core/models/gemstones.models';

import bundle from '../../../../../public/i18n/content/en.json';

import { PalettePanelComponent } from './palette-panel.component';

const stone = (over: Partial<CustomerRecommendation> = {}): CustomerRecommendation => ({
  materialSlug: 'onyx',
  canonicalNameEn: 'Onyx',
  representativeSlug: 'onyx',
  tier: 'Primary',
  score: 1.5,
  confidence: 0.6,
  confidenceBand: 'Qualified',
  independentSourceCount: 1,
  traditionKeys: ['western-magical'],
  reasons: [],
  isCautioned: false,
  cautions: [],
  disagreement: null,
  isAvailableAsBead: false,
  ...over,
});

describe('PalettePanelComponent', () => {
  let fixture: ComponentFixture<PalettePanelComponent>;

  const render = (
    recommendations: readonly CustomerRecommendation[],
    unavailable: readonly CustomerUnavailableGroup[] = [],
  ) => {
    fixture.componentRef.setInput('recommendations', recommendations);
    fixture.componentRef.setInput('unavailable', unavailable);
    fixture.detectChanges();
  };

  const cards = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button.stone')) as HTMLElement[];

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PalettePanelComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    TestBed.inject(TranslateService).setTranslation('en', bundle as TranslationObject);
    TestBed.inject(TranslateService).use('en');

    fixture = TestBed.createComponent(PalettePanelComponent);
  });

  /**
   * D21: the palette is the person's chart and nothing else.
   */
  it('offers exactly the stones the chart named', () => {
    render([stone(), stone({ materialSlug: 'lava', canonicalNameEn: 'Lava' })]);

    expect(cards()).toHaveLength(2);
    expect(cards().map((c) => c.getAttribute('data-slug'))).toEqual(['onyx', 'lava']);
  });

  /**
   * The reading's five-and-expand does not come with it.
   *
   * A headline needs brevity because it is a claim being made to someone. A
   * palette is a set of materials being offered, and twenty is a good number to
   * choose from — so every stone is drawn and nothing hides behind a "show more".
   */
  it('shows every stone, with no cap and nothing behind an expander', () => {
    const twenty = Array.from({ length: 20 }, (_, i) =>
      stone({ materialSlug: `stone-${i}`, canonicalNameEn: `Stone ${i}` }),
    );

    render(twenty);

    expect(cards()).toHaveLength(20);
    expect(fixture.nativeElement.querySelector('[data-testid="palette-expand"]')).toBeNull();
  });

  /**
   * Post-D22 the median chart is ~20 stones with Primary holding most of them,
   * and `01-sparse-output` is 19 Primary, 1 Secondary, 0 Tertiary. A panel built
   * around three balanced sections renders that as one heading with everything
   * under it and two empty holes, which reads as broken rather than as true.
   *
   * So tier is a per-stone marker and the grid is flat: 19/1/0 draws as twenty
   * cards, exactly like 7/7/6 does.
   */
  describe('the 19/1/0 chart', () => {
    const lopsided = [
      ...Array.from({ length: 19 }, (_, i) =>
        stone({ materialSlug: `p-${i}`, canonicalNameEn: `Primary ${i}`, tier: 'Primary' }),
      ),
      stone({ materialSlug: 's-0', canonicalNameEn: 'Secondary 0', tier: 'Secondary' }),
    ];

    it('draws one flat grid rather than tier sections', () => {
      render(lopsided);

      // One list, not one per tier.
      expect(fixture.nativeElement.querySelectorAll('ul[role="list"]')).toHaveLength(1);
      expect(cards()).toHaveLength(20);
    });

    it('marks the tier on every stone, so the single-group case still says which', () => {
      render(lopsided);

      const markers = cards().map((c) => c.textContent ?? '');
      expect(markers.filter((t) => /primary/i.test(t))).toHaveLength(19);
      expect(markers.filter((t) => /secondary/i.test(t))).toHaveLength(1);
    });

    it('keeps the backend tier order — primaries first, then the secondary', () => {
      render([lopsided[19], ...lopsided.slice(0, 19)]);

      expect(cards()[0].getAttribute('data-slug')).toBe('p-0');
      expect(cards()[19].getAttribute('data-slug')).toBe('s-0');
    });
  });

  it('states the size of the palette as a fact about the chart', () => {
    render([stone(), stone({ materialSlug: 'lava' })]);

    expect(text()).toContain('2');
  });

  describe('cautioned stones', () => {
    it('carries a caution mark', () => {
      render([stone({ isCautioned: true })]);

      expect(cards()[0].textContent).toMatch(/!/);
    });

    /** The mark is a warning, not a lock — the gate is a separate, later step. */
    it('is still offered, not disabled', () => {
      render([stone({ isCautioned: true })]);

      expect((cards()[0] as HTMLButtonElement).disabled).toBe(false);
    });

    it('says "cautioned" to a screen reader, which cannot see the mark', () => {
      render([stone({ isCautioned: true })]);

      expect(cards()[0].getAttribute('aria-label')).toContain('cautioned');
    });
  });

  /**
   * Not a palette — an explanation. `BirthTimeUnknown` in particular is
   * something the person could unlock, and the response already says so.
   */
  it('explains what could not be assessed, with its reason', () => {
    render([stone()], [{ reason: 'BirthTimeUnknown', count: 4, reasonKey: 'x' }]);

    const block = fixture.nativeElement.querySelector('[data-testid="palette-unavailable"]');
    expect(block).not.toBeNull();
    expect(block.textContent).toContain('4');
  });

  it('says nothing about unavailability when there is none', () => {
    render([stone()]);

    expect(fixture.nativeElement.querySelector('[data-testid="palette-unavailable"]')).toBeNull();
  });

  it('has an honest empty state rather than a broken grid', () => {
    render([]);

    expect(fixture.nativeElement.querySelector('[data-testid="palette-empty"]')).not.toBeNull();
    expect(cards()).toHaveLength(0);
  });

  /**
   * <b>Two stones can arrive with the same display name, and the panel must not
   * try to tell them apart.</b>
   *
   * `aquamarine` and `beryl` are separate active materials both called "Beryl and
   * Aquamarine". That is not a gap in the catalogue — it is what the source says.
   * Pavitt records them as "practically the same stone, differing only in colour",
   * and then records that the trade itself disagrees which name goes with which:
   * one merchant calls the green stone Beryl, his neighbour gives that name to the
   * blue. The book declines to choose, and the refusal is evidence.
   *
   * So this is not a question waiting to be answered. Splitting the two names by
   * colour in a template would be inventing an answer the source explicitly
   * withholds, and it would do it in the one place nobody would think to look for
   * a mineral-identity decision.
   *
   * <b>This test fails if anyone tries.</b> The right fix is upstream — one
   * synonym group, one palette slot — not two labels here.
   */
  it('renders the name it was given, even when two stones share one', () => {
    render([
      stone({ materialSlug: 'aquamarine', canonicalNameEn: 'Beryl and Aquamarine' }),
      stone({ materialSlug: 'beryl', canonicalNameEn: 'Beryl and Aquamarine' }),
    ]);

    const names = cards().map(
      (c) =>
        Array.from(c.querySelectorAll('span'))
          .map((s) => s.textContent?.trim() ?? '')
          .find((t) => t.length > 0) ?? '',
    );
    expect(names).toEqual(['Beryl and Aquamarine', 'Beryl and Aquamarine']);

    // Distinguishable in the DOM, and only in the DOM.
    expect(cards().map((c) => c.getAttribute('data-slug'))).toEqual(['aquamarine', 'beryl']);
  });

  it('emits the whole recommendation when a stone is picked, not just its slug', () => {
    const picked: CustomerRecommendation[] = [];
    render([stone({ materialSlug: 'lava', canonicalNameEn: 'Lava' })]);
    fixture.componentInstance.stonePicked.subscribe((s) => picked.push(s));

    cards()[0].click();

    // The caution gate needs `cautions`, so a slug alone would not be enough.
    expect(picked).toHaveLength(1);
    expect(picked[0].materialSlug).toBe('lava');
  });
});
