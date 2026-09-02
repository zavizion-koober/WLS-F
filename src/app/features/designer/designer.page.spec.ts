import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { API_URLS } from '@core/http/api-urls.token';
import { ReadingStore } from '@features/reading/reading.store';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';

import bundle from '../../../../public/i18n/content/en.json';

import { BraceletDesignStore } from './bracelet-design.store';
import { DesignerPage } from './designer.page';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/**
 * The page will not render without a reading — that is the D21 rule, tested
 * elsewhere. This stands one in so the clearing behaviour can be reached.
 */
class ReadingStoreStub {
  readonly isLoading = signal(false);
  readonly failure = signal(null);
  /**
   * One stone, because the palette only draws its list when it has one — and the
   * "rope is full" notice lives inside that list. A stub with no recommendations
   * silently skips the branch under test.
   */
  readonly result = signal({
    recommendations: [
      {
        materialSlug: 'onyx',
        representativeSlug: 'onyx',
        displayName: 'Onyx',
        tier: 'Primary',
        isCautioned: false,
      },
    ],
    unavailable: [],
  });
  loadSession(): void {}
}

/**
 * <b>Clearing, and the eight seconds afterwards.</b>
 *
 * The window is the whole feature: a clear with no way back is a confirmation
 * dialog wearing different clothes, and a clear whose undo never expires is a
 * banner that lives on the page forever. Both ends are asserted here.
 */
describe('sc-designer-page — clearing the board', () => {
  let fixture: ComponentFixture<DesignerPage>;
  let store: BraceletDesignStore;

  const query = (testid: string) =>
    fixture.nativeElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement | null;

  beforeEach(() => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      imports: [DesignerPage, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_URLS, useValue: { rest: '/api' } },
        { provide: ReadingStore, useClass: ReadingStoreStub },
      ],
    });

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', bundle as unknown as TranslationObject);
    translate.use('en');

    fixture = TestBed.createComponent(DesignerPage);
    fixture.componentRef.setInput('publicId', 'session-1');
    fixture.detectChanges();

    store = fixture.debugElement.injector.get(BraceletDesignStore);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Answers the rope solve the store sends on startup.
   *
   * The debounce has to be run out first — the request does not exist until it
   * has. Everything downstream of a rope (how many places, whether it is full,
   * whether it can be saved) needs this to have happened, which is why almost
   * every test here begins with it.
   */
  const solveRope = (beadCount: number, isWithinTolerance = true) => {
    const http = TestBed.inject(HttpTestingController);

    // The rope solve needs a template, and the template arrives over the wire
    // like everything else. Answering it is what starts the pipeline at all.
    for (const request of http.match((r) => r.url.endsWith('/bracelets/templates'))) {
      request.flush([
        {
          publicId: 'tpl-1',
          slug: 'single-strand-elastic',
          nameKey: 'bracelet.template.singleStrandElastic',
          allowedDiametersMm: [6, 8, 10, 12],
          minBeadCount: 12,
          maxBeadCount: 45,
          lockedStoneTier: null,
        },
      ]);
    }

    for (const request of http.match((r) => r.url.endsWith('/bracelets/sizing'))) {
      request.flush({
        beadDiametersMm: [6, 8, 10, 12],
        wristMinMm: 130,
        wristMaxMm: 210,
        wristStepMm: 5,
        elasticEaseMm: 10,
        fitToleranceMm: 6,
        grades: ['Standard', 'Premium'],
        status: 'PROVISIONAL',
        openQuestion: 'Q-8',
      });
    }

    fixture.detectChanges();
    vi.advanceTimersByTime(200);
    fixture.detectChanges();

    // A rope is two requests: how many places, then where each one sits. Both
    // are answered with the same body — only `beadCount` and the slots matter.

    const body = {
      templateSlug: 'single-strand-elastic',
      wristCircumferenceMm: 170,
      beadCount,
      innerCircumferenceMm: 183.4,
      ringRadiusMm: 33.185,
      fitDeviationMm: 3.4,
      isWithinTolerance,
      solverVersion: 'test',
      slots: Array.from({ length: beadCount }, (_, i) => ({
        position: i,
        sku: 'PROBE',
        // Deliberately a stone nobody chose: this is the probe, and if it ever
        // reaches the screen these tests are what should notice.
        materialSlug: 'onyx',
        canonicalNameEn: 'Onyx',
        diameterMm: 8,
        grade: 'Standard',
        lock: 'None',
        sourceMaterialSlug: null,
        centreXMm: i,
        centreYMm: -i,
      })),
    };

    // 1. How many places.
    const counting = http.match((r) => r.url.endsWith('/bracelets/solve'));
    expect(counting.length).toBeGreaterThan(0);
    counting[counting.length - 1].flush(body);
    fixture.detectChanges();

    // 2. Where they sit — asked as soon as the count lands.
    const placing = http.match((r) => r.url.endsWith('/bracelets/solve'));
    expect(placing.length).toBeGreaterThan(0);
    placing[placing.length - 1].flush(body);
    fixture.detectChanges();
  };

  const build = () => {
    solveRope(12);
    store.addBead('onyx');
    store.addBead('lava');
    store.addBead('mica');
    fixture.detectChanges();
  };

  /**
   * <b>The rope is on screen before the first stone.</b>
   *
   * There used to be three states here — an open row under three beads, a ring
   * once the strand had solved, and a skeleton in between — because the ring was
   * solved FROM the stones, so it did not exist until they did and it grew as
   * they arrived. The third state was reachable exactly once per session, on the
   * third bead, and it flashed a grey box in place of the beads just placed.
   *
   * With a rope there is one thing to draw. It has a length before any stone is
   * chosen, and choosing stones fills it.
   */
  describe('the rope', () => {
    const stage = () => fixture.nativeElement.querySelector('.stage') as HTMLElement;

    it('is drawn empty, before a single stone is chosen', () => {
      solveRope(6);

      expect(store.strand()).toHaveLength(0);
      expect(stage().querySelector('sc-strand-view')).not.toBeNull();
      expect(stage().querySelectorAll('[data-testid="empty-place"]')).toHaveLength(6);
      expect(stage().querySelectorAll('[role="option"]')).toHaveLength(0);
    });

    it('fills a place per stone, and the rest stay empty', () => {
      solveRope(6);

      store.addBead('onyx');
      store.addBead('lava');
      fixture.detectChanges();

      expect(stage().querySelectorAll('[role="option"]')).toHaveLength(2);
      expect(stage().querySelectorAll('[data-testid="empty-place"]')).toHaveLength(4);
    });

    /** The whole point: the ring does not grow. */
    it('does not change size as stones are added', () => {
      solveRope(6);

      const ring = () => stage().querySelector('svg > g > circle')!.getAttribute('r');
      const before = ring();

      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      fixture.detectChanges();

      expect(ring()).toBe(before);
    });

    it('shows no skeleton once there is a rope', () => {
      solveRope(6);

      expect(stage().querySelector('sc-loading-skeleton')).toBeNull();
    });

    /**
     * The skeleton is still right for the one genuinely empty wait left: before
     * any rope has been solved there is nothing to draw.
     */
    it('keeps the skeleton for the wait before the first rope', () => {
      expect(store.rope()).toBeNull();
      expect(stage().querySelector('sc-loading-skeleton')).not.toBeNull();
      expect(stage().querySelector('sc-strand-view')).toBeNull();
    });

    it('says how many places are filled, out of how many there are', () => {
      solveRope(6);
      store.addBead('onyx');
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="places-filled"]')!.textContent!.trim(),
      ).toBe('1 of 6');
    });

    it('stops the palette when every place is filled', () => {
      solveRope(2);
      expect(query('palette-full')).toBeNull();

      store.addBead('onyx');
      store.addBead('lava');
      fixture.detectChanges();

      expect(query('palette-full')).not.toBeNull();
    });
  });

  it('empties the board straight away, with no question asked first', () => {
    build();

    query('clear-board')!.click();
    fixture.detectChanges();

    expect(store.strand()).toEqual([]);
    // Nothing to confirm — the offer that appears is after the fact.
    expect(query('undo-offer')).not.toBeNull();
  });

  it('puts back exactly what it took', () => {
    build();
    const before = store.strand();

    query('clear-board')!.click();
    fixture.detectChanges();

    (query('undo-offer')!.querySelector('button') as HTMLElement).click();
    fixture.detectChanges();

    expect(store.strand()).toBe(before);
    expect(query('undo-offer')).toBeNull();
  });

  it('the offer stands for eight seconds and then goes', () => {
    build();

    query('clear-board')!.click();
    fixture.detectChanges();

    vi.advanceTimersByTime(7_999);
    fixture.detectChanges();
    expect(query('undo-offer')).not.toBeNull();

    vi.advanceTimersByTime(2);
    fixture.detectChanges();
    expect(query('undo-offer')).toBeNull();
    expect(store.strand()).toEqual([]);
  });

  /**
   * A second clear inside the window restarts it rather than inheriting the
   * remainder of the first — otherwise an undo offered at 7.9 seconds vanishes
   * a tenth of a second later.
   */
  it('a second clear gets its own eight seconds', () => {
    build();
    query('clear-board')!.click();
    fixture.detectChanges();

    vi.advanceTimersByTime(7_000);

    store.addBead('onyx');
    fixture.detectChanges();
    query('clear-board')!.click();
    fixture.detectChanges();

    vi.advanceTimersByTime(7_000);
    fixture.detectChanges();

    expect(query('undo-offer')).not.toBeNull();
  });

  it('offers nothing when there was nothing on the board', () => {
    query('clear-board')?.click();
    fixture.detectChanges();

    expect(query('undo-offer')).toBeNull();
  });

  it('allows editing a saved bracelet without reverting on changes', () => {
    const savedService = TestBed.inject(SavedBraceletsService);
    savedService.saveBracelet({
      id: 'saved-bracelet-1',
      name: 'Custom Talisman',
      readingPublicId: 'session-1',
      wristMm: 170,
      diameterMm: 8,
      grade: 'Standard',
      strand: [
        { materialSlug: 'onyx', diameterMm: 8, grade: 'Standard' },
        { materialSlug: 'amethyst', diameterMm: 8, grade: 'Standard' },
      ],
    });

    const saved = savedService.getById('saved-bracelet-1')!;
    store.loadSavedBracelet(saved);
    fixture.detectChanges();

    expect(store.wristMm()).toBe(170);
    expect(store.strand().length).toBe(2);

    // Change wrist size
    store.wristMm.set(165);
    fixture.detectChanges();

    expect(store.wristMm()).toBe(165);

    // Clear
    query('clear-board')!.click();
    fixture.detectChanges();

    expect(store.strand()).toEqual([]);
  });
});
