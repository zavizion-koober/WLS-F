import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';

import type { CustomerCaution, CustomerRecommendation } from '@core/models/gemstones.models';

import bundle from '../../../../../public/i18n/content/en.json';

import { CautionGateComponent } from './caution-gate.component';

const caution = (reasonKey: string): CustomerCaution =>
  ({ reasonKey, traditionKey: 'western-magical', ruleId: 'r-1' }) as CustomerCaution;

const cautioned = (over: Partial<CustomerRecommendation> = {}): CustomerRecommendation => ({
  materialSlug: 'garnet',
  canonicalNameEn: 'Garnet',
  representativeSlug: 'garnet',
  tier: 'Secondary',
  score: 1.2,
  confidence: 0.6,
  confidenceBand: 'Qualified',
  independentSourceCount: 1,
  traditionKeys: ['western-magical'],
  reasons: [],
  isCautioned: true,
  cautions: [caution('caution.planet.mars.afflicted')],
  disagreement: null,
  isAvailableAsBead: false,
  ...over,
});

describe('CautionGateComponent', () => {
  let fixture: ComponentFixture<CautionGateComponent>;

  const render = (stone: CustomerRecommendation) => {
    fixture.componentRef.setInput('stone', stone);
    fixture.detectChanges();
  };

  const buttons = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CautionGateComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    TestBed.inject(TranslateService).setTranslation('en', bundle as TranslationObject);
    TestBed.inject(TranslateService).use('en');

    fixture = TestBed.createComponent(CautionGateComponent);
  });

  it('names the stone being warned about', () => {
    render(cautioned());

    expect(fixture.nativeElement.textContent).toContain('Garnet');
  });

  it('shows one line per caution, so none is summarised away', () => {
    render(
      cautioned({
        cautions: [
          caution('caution.planet.mars.afflicted'),
          caution('caution.element.fire.excess'),
        ],
      }),
    );

    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(2);
  });

  it('offers a way out as well as a way through', () => {
    render(cautioned());

    expect(buttons()).toHaveLength(2);
  });

  it('acknowledging is a separate act from dismissing', () => {
    render(cautioned());
    let accepted = 0;
    let dismissed = 0;
    fixture.componentInstance.acknowledged.subscribe(() => (accepted += 1));
    fixture.componentInstance.dismissed.subscribe(() => (dismissed += 1));

    buttons()[0].click();
    expect([accepted, dismissed]).toEqual([1, 0]);

    buttons()[1].click();
    expect([accepted, dismissed]).toEqual([1, 1]);
  });

  it('announces itself to a screen reader as something needing an answer', () => {
    render(cautioned());

    const root = fixture.nativeElement.querySelector('[data-testid="caution-gate"]');
    expect(root.getAttribute('role')).toBe('alertdialog');
    expect(root.getAttribute('aria-label')).toBeTruthy();
  });
});

/**
 * The invariant, checked at the level it actually holds at.
 *
 * A component test can only show that <i>this</i> gate behaves. The claim worth
 * defending is stronger — <b>there is no path through the designer that puts a
 * cautioned stone on a strand without its warning visible</b> — and that is a
 * property of who may call the one method that places a bead.
 *
 * `place()` is private, and it may be reached from exactly two places: `pick()`,
 * which forwards only uncautioned stones, and `acceptCaution()`, which is the
 * gate's own output. A third call site added later would silently open a way
 * round the gate and pass every behavioural test in this file, so the call sites
 * are counted here rather than the behaviour re-asserted.
 */
describe('no way round the gate', () => {
  const page = readFileSync(
    join(process.cwd(), 'src/app/features/designer/designer.page.ts'),
    'utf8',
  );

  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

  it('places a bead from exactly two call sites', () => {
    const callSites = code.match(/this\.place\(/g) ?? [];

    expect(callSites).toHaveLength(2);
  });

  it('the gate is one of them, and the other refuses cautioned stones', () => {
    const pick = code.slice(
      code.indexOf('protected pick('),
      code.indexOf('protected acceptCaution('),
    );

    // The guard, and the early return that makes it a guard rather than a note.
    expect(pick).toMatch(/if\s*\(stone\.isCautioned\)/);
    expect(pick).toMatch(/return;/);

    const accept = code.slice(code.indexOf('protected acceptCaution('));
    expect(accept).toMatch(/this\.place\(/);
  });

  it('keeps placing private, so nothing outside the page can bypass pick()', () => {
    expect(code).toMatch(/private place\(/);
  });
});
