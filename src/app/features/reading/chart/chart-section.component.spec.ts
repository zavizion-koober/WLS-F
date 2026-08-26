import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CustomerChart } from '@core/models/gemstones.models';

import bundle from '../../../../../public/i18n/content/en.json';
import { chart, degradedChart } from '../reading-fixtures';

import { ChartSectionComponent } from './chart-section.component';

@Component({
  standalone: true,
  imports: [ChartSectionComponent],
  template: `<sc-chart-section [chart]="chart()" />`,
})
class Host {
  // A signal, not a plain field. Under zoneless change detection a plain field
  // reassigned mid-test never marks the host dirty, so the second
  // detectChanges() renders nothing and the assertion silently runs against the
  // first render. That is a test that cannot fail.
  readonly chart = signal<CustomerChart>(chart());
}

describe('sc-chart-section', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Host, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', bundle as unknown as TranslationObject);
    translate.use('en');
    fixture = TestBed.createComponent(Host);
  });

  const text = () => fixture.nativeElement.textContent as string;
  const query = (selector: string) => fixture.nativeElement.querySelector(selector);
  const queryAll = (selector: string) =>
    [...fixture.nativeElement.querySelectorAll(selector)] as HTMLElement[];

  describe('a timed chart', () => {
    beforeEach(() => fixture.detectChanges());

    it('renders every body with its sign and degree', () => {
      const rows = queryAll('tbody tr');
      expect(rows).toHaveLength(4);
      expect(text()).toContain('Sun');
      expect(text()).toContain('Taurus');
      expect(text()).toContain('24.3°');
    });

    it('renders the house column', () => {
      expect(text()).toContain('House');
      expect(queryAll('tbody tr')[0].textContent).toContain('10');
    });

    it('marks a retrograde body', () => {
      expect(text()).toContain('Retrograde');
    });

    it('shows a real dignity and suppresses Neutral', () => {
      // "In its own sign" is worth a badge. "Neutral" on eight of ten rows is noise.
      expect(text()).toContain('In its own sign');
      expect(text()).not.toContain('Neutral');
    });

    it('shows nothing at all for an Unknown dignity', () => {
      // Unknown means the source contradicts itself and NO dignity-conditioned
      // rule fired. Rendering anything would imply a dignity the reading did not
      // use — which is worse than rendering nothing.
      expect(text()).not.toContain('Unknown');
      expect(text()).not.toContain('inconsistent');
    });

    it('marks a hedged dignity and explains the mark', () => {
      // Mercury's dignity is StatedButHedged. A dignity shown without its state
      // states a hedged claim plainly.
      expect(text()).toContain('*');
      expect(text()).toContain('describes rather than states outright');
    });

    it('names the chart ruler and says why it rules', () => {
      const ruler = query('[data-testid="chart-ruler"]');
      expect(ruler).not.toBeNull();
      expect(ruler.textContent).toContain('Venus');
      // The reason, interpolated from the key — not a raw dot path.
      expect(ruler.textContent).toContain('rules Libra');
      expect(ruler.textContent).toContain('rising');
      expect(ruler.textContent).not.toContain('chart.ruler');
    });

    it('names the rulership scheme, because the answer is relative to it', () => {
      expect(query('[data-testid="chart-ruler"]').textContent).toContain('western chart practice');
    });

    it('renders the rising sign and midheaven', () => {
      expect(text()).toContain('Rising sign');
      expect(text()).toContain('Midheaven');
    });

    it('shows no degraded notice', () => {
      expect(query('[data-testid="degraded-notice"]')).toBeNull();
    });

    it('reports an even energy split as no dominance', () => {
      // The backend publishes null on a tie rather than picking a side, and so
      // must this. "Projective predominates" on a 5–5 chart is a fabrication.
      expect(text()).toContain('evenly matched');
      expect(text()).not.toContain('predominates');
    });
  });

  describe('a chart with no birth time', () => {
    beforeEach(() => {
      fixture.componentInstance.chart.set(degradedChart());
      fixture.detectChanges();
    });

    it('says why things are missing instead of showing blanks', () => {
      const notice = query('[data-testid="degraded-notice"]');
      expect(notice).not.toBeNull();
      expect(notice.textContent).toContain('no rising sign, no houses and no chart ruler');
    });

    it('drops the house column entirely rather than filling it with dashes', () => {
      // A column of dashes tells a person their chart has empty houses. No column,
      // plus the notice above, tells them the truth.
      expect(text()).not.toContain('House');
    });

    it('renders no angles and no chart ruler', () => {
      expect(text()).not.toContain('Rising sign');
      expect(query('[data-testid="chart-ruler"]')).toBeNull();
    });

    it('still renders the planets, which are real', () => {
      // Degradation removes what the birth time supported, not the whole chart.
      expect(queryAll('tbody tr')).toHaveLength(4);
      expect(text()).toContain('Taurus');
    });
  });

  describe('the energy profile', () => {
    it('names the dominant pole when there is one', () => {
      fixture.componentInstance.chart.set(
        chart({
          distribution: {
            elements: { fire: 4, earth: 2, air: 3, water: 1 },
            modalities: { cardinal: 4, fixed: 3, mutable: 3 },
            energy: { projective: 7, receptive: 3, dominant: 'Projective' },
          },
        }),
      );
      fixture.detectChanges();

      expect(text()).toContain('Projective energy predominates');
      // And it says what the tradition does about it, which is the useful part.
      expect(text()).toContain('receptive stones are offered');
    });
  });

  it('renders no raw translation keys anywhere', () => {
    fixture.detectChanges();
    expect(text()).not.toContain('STONECRAFT.');
  });
});
