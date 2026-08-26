import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, concat, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BraceletsApiService } from '@core/api/bracelets-api.service';
import { type RequestState } from '@core/api/request-state';
import type {
  BeadSizingResponse,
  BraceletTemplateResponse,
  ConfiguredBeadSlot,
  ConfiguredBraceletResponse,
  SolveBraceletRequest,
  SolvedBraceletResponse,
} from '@core/models/bracelets.models';

import { BraceletDesignStore, type DesignerStone } from './bracelet-design.store';

const template: BraceletTemplateResponse = {
  publicId: 'tpl-1',
  slug: 'single-strand-elastic',
  nameKey: 'BRACELET.TEMPLATE.SINGLE_STRAND_ELASTIC',
  allowedDiametersMm: [6, 8, 10, 12],
  minBeadCount: 12,
  maxBeadCount: 45,
  lockedStoneTier: null,
};

const slot = (position: number, materialSlug: string): ConfiguredBeadSlot =>
  ({
    position,
    sku: `${materialSlug.toUpperCase()}-08-STD`,
    materialSlug,
    canonicalNameEn: materialSlug,
    diameterMm: 8,
    grade: 'Standard',
    lock: 'None',
    sourceMaterialSlug: null,
    centreXMm: 0,
    centreYMm: -10,
  }) as ConfiguredBeadSlot;

const solved = (over: Partial<SolvedBraceletResponse> = {}): SolvedBraceletResponse => ({
  templateSlug: 'single-strand-elastic',
  wristCircumferenceMm: 170,
  beadCount: 3,
  innerCircumferenceMm: 24,
  ringRadiusMm: 8,
  fitDeviationMm: -146,
  isWithinTolerance: false,
  slots: [slot(0, 'onyx'), slot(1, 'onyx'), slot(2, 'onyx')],
  solverVersion: 'solver-1',
  ...over,
});

const stone = (slug: string): DesignerStone =>
  ({ slug, name: slug, recommendation: { materialSlug: slug } }) as DesignerStone;

/**
 * A fake solve endpoint that records every request and lets a test decide when
 * each one answers. Hand-written rather than mocked wholesale: the point of most
 * of these tests is *which* requests went out and in what order, and a stub that
 * keeps the list is the only way to assert that.
 */
class FakeApi {
  readonly requests: SolveBraceletRequest[] = [];
  readonly pending: Subject<RequestState<SolvedBraceletResponse>>[] = [];
  configured: unknown = null;

  solve(request: SolveBraceletRequest) {
    this.requests.push(request);
    const subject = new Subject<RequestState<SolvedBraceletResponse>>();
    this.pending.push(subject);
    // The real client emits `loading` on subscribe before anything arrives, and
    // the store's staleness depends on seeing it. A stub that jumps straight to
    // the answer tests a pipeline the app does not have.
    return concat(of({ status: 'loading' } as RequestState<SolvedBraceletResponse>), subject);
  }

  configure(request: unknown) {
    this.configured = request;
    return of({
      status: 'success',
      value: { publicId: 'cfg-9' } as ConfiguredBraceletResponse,
    } as RequestState<ConfiguredBraceletResponse>);
  }
}

describe('BraceletDesignStore', () => {
  let store: BraceletDesignStore;
  let api: FakeApi;

  /**
   * Answers a rope solve — <b>both halves of it</b>.
   *
   * A rope is two requests: the demand path says how many places there are for
   * this mix of sizes, then the strand path says where each one sits in the
   * person's order. The second is subscribed the moment the first succeeds, so
   * both are answered here; a helper that answered only the first would leave
   * every test waiting on a rope that never arrives.
   *
   * The answer echoes the wrist and diameter that were ASKED FOR, because the
   * store refuses to trim a strand against a rope that does not describe the
   * current size — a stub that always says "170 mm" would leave that path
   * permanently disabled and the tests passing for the wrong reason.
   */
  const answerRope = (beadCount: number, over: Partial<SolvedBraceletResponse> = {}) => {
    settle();

    const request = api.requests[api.requests.length - 1];
    const diameterMm =
      request.beads[request.beads.length - 1]?.diameterMm ?? request.strand?.[0]?.diameterMm ?? 8;

    const value = solved({
      beadCount,
      isWithinTolerance: true,
      wristCircumferenceMm: request.wristCircumferenceMm,
      slots: Array.from({ length: beadCount }, (_, i) => ({ ...slot(i, 'onyx'), diameterMm })),
      ...over,
    });

    // 1. The count.
    api.pending[api.pending.length - 1].next({ status: 'success', value });
    TestBed.tick();

    // 2. The places, which the store asks for as soon as it has the count.
    api.pending[api.pending.length - 1].next({ status: 'success', value });
    TestBed.tick();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = new FakeApi();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BraceletsApiService, useValue: api },
        BraceletDesignStore,
      ],
    });

    store = TestBed.inject(BraceletDesignStore);
    store.template.set(template);
    store.palette.set([stone('onyx'), stone('lava'), stone('mica')]);
  });

  /**
   * Flushes the design into the solve pipeline and runs the debounce.
   *
   * Tick first: `toObservable` publishes the computed on the next change
   * detection, so advancing the clock before that would run the debounce on an
   * empty pipeline and no request would go out.
   */
  const settle = () => {
    TestBed.tick();
    vi.advanceTimersByTime(200);
    TestBed.tick();
  };

  describe('mutations', () => {
    it('addBead appends, keeping the existing order', () => {
      store.addBead('onyx');
      store.addBead('lava');

      expect(store.strand().map((p) => p.materialSlug)).toEqual(['onyx', 'lava']);
    });

    it('addBead stamps the current diameter and grade', () => {
      store.diameterMm.set(10);
      store.grade.set('Premium');
      store.addBead('onyx');

      expect(store.strand()[0]).toMatchObject({ diameterMm: 10, grade: 'Premium' });
    });

    it('replaceBeadAt swaps one bead and leaves its neighbours alone', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      store.replaceBeadAt(1, 'onyx');

      expect(store.strand().map((p) => p.materialSlug)).toEqual(['onyx', 'onyx', 'mica']);
    });

    it('removeBeadAt drops that bead and renumbers the rest', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      store.removeBeadAt(0);

      // `StrandPosition` carries no index of its own — order *is* the array —
      // so there is no position field that could disagree with it.
      expect(store.strand().map((p) => p.materialSlug)).toEqual(['lava', 'mica']);
    });

    it('removing the selected bead clears the selection rather than moving it', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.selected.set(1);

      store.removeBeadAt(1);

      expect(store.selected()).toBeNull();
    });

    it('removing a bead before the selected one shifts the selection down with it', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      store.selected.set(2);

      store.removeBeadAt(0);

      // Still the same *stone*, which is what the person is looking at.
      expect(store.selected()).toBe(1);
      expect(store.strand()[1].materialSlug).toBe('mica');
    });

    it('moveBead reorders and takes the selection with the bead', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      store.moveBead(0, 2);

      expect(store.strand().map((p) => p.materialSlug)).toEqual(['lava', 'mica', 'onyx']);
      expect(store.selected()).toBe(2);
    });

    it('moveBead out of range is a no-op, not a truncation', () => {
      store.addBead('onyx');
      store.addBead('lava');
      const before = store.strand();

      store.moveBead(0, 5);
      store.moveBead(-1, 0);

      expect(store.strand()).toBe(before);
    });

    it('reset clears the design and everything derived from a save', () => {
      store.addBead('onyx');
      store.selected.set(0);
      store.saved.set({ publicId: 'cfg-1' } as ConfiguredBraceletResponse);

      store.reset();

      expect(store.strand()).toEqual([]);
      expect(store.selected()).toBeNull();
      expect(store.saved()).toBeNull();
      expect(store.saving().status).toBe('idle');
    });
  });

  /**
   * <b>The rope is solved from the wrist, not from the stones.</b>
   *
   * This is the change these tests exist to pin. The design used to be solved
   * bead by bead — every stone a round trip, and the ring grew as they arrived,
   * so a half-built bracelet reported a fit of −176 mm. A bracelet is a rope of a
   * length the wrist decides, with a fixed number of places on it. Choosing
   * stones fills places; it does not lengthen the rope, and it does not ask the
   * solver anything.
   */
  describe('solving the rope', () => {
    it('asks before a single stone is chosen', () => {
      settle();

      expect(api.requests).toHaveLength(1);
      expect(api.requests[0].wristCircumferenceMm).toBe(170);
    });

    /**
     * Two requests, and they are different questions.
     *
     * The demand path knows how many beads of a mix fit a wrist; only the strand
     * path knows where each one sits once the person has chosen an order, because
     * with mixed diameters the step between two beads depends on both of them.
     * The second is asked only once the first has answered.
     */
    it('asks how many, then where', () => {
      settle();

      expect(api.requests).toHaveLength(1);
      expect(api.requests[0].beads.length).toBeGreaterThan(0);
      expect(api.requests[0].strand).toBeUndefined();

      answerRope(5);

      expect(api.requests).toHaveLength(2);
      expect(api.requests[1].strand).toBeDefined();
      expect(api.requests[1].beads).toEqual([]);
    });

    it('fills the rest of the rope with the size being chosen now', () => {
      answerRope(5);

      expect(api.requests[1].strand).toHaveLength(5);
      expect(api.requests[1].strand?.every((p) => p.diameterMm === 8)).toBe(true);
    });

    /**
     * <b>Adding a stone of the size already in use asks nothing.</b>
     *
     * A filler simply becomes a real bead in the same place: the sequence of
     * diameters is identical, so the rope is identical, so there is no question
     * to ask. Twenty-six same-size beads cost zero solves.
     */
    it('does not ask again for a stone of the size already in use', () => {
      answerRope(26);
      const before = api.requests.length;

      for (let i = 0; i < 10; i++) {
        store.addBead('onyx');
      }
      settle();

      expect(api.requests).toHaveLength(before);
    });

    it('asks again when a different size is mixed in', () => {
      answerRope(26);
      store.addBead('onyx');
      settle();
      const before = api.requests.length;

      store.diameterMm.set(10);
      settle();

      expect(api.requests.length).toBeGreaterThan(before);
      // The mix is carried: what is already placed, and the new filler size.
      const demand = api.requests[api.requests.length - 1];
      expect(demand.beads.map((b) => b.diameterMm)).toEqual([8, 10]);
    });

    it('asks again when the wrist changes', () => {
      answerRope(26);

      store.wristMm.set(190);
      settle();

      expect(api.requests[api.requests.length - 1].wristCircumferenceMm).toBe(190);
    });

    it('debounces a burst of size changes into one question', () => {
      answerRope(26);
      const before = api.requests.length;

      store.wristMm.set(175);
      store.wristMm.set(180);
      store.wristMm.set(185);
      settle();

      expect(api.requests).toHaveLength(before + 1);
      expect(api.requests[api.requests.length - 1].wristCircumferenceMm).toBe(185);
    });

    /**
     * The `switchMap` guarantee. A slow rope answering after a fast one would
     * draw the wrong bracelet, and nothing on screen would look wrong.
     */
    it('a stale rope that answers late never reaches the ring', () => {
      answerRope(26);

      store.wristMm.set(190);
      settle();
      const stale = api.pending[api.pending.length - 1];

      store.wristMm.set(210);
      answerRope(31);

      stale.next({ status: 'success', value: solved({ beadCount: 26 }) });
      TestBed.tick();

      expect(store.rope()?.beadCount).toBe(31);
    });

    /** A failed count must not be followed by a request for places. */
    it('does not ask where when it could not learn how many', () => {
      settle();
      const before = api.requests.length;

      api.pending[api.pending.length - 1].next({
        status: 'error',
        failure: {
          code: 'RATE_LIMITED',
          status: 429,
          detail: null,
          validationErrors: null,
          retryAfterSeconds: 60,
        },
      });
      TestBed.tick();

      expect(api.requests).toHaveLength(before);
      expect(store.isStale()).toBe(true);
    });
  });

  describe('the rope survives a solve that does not answer', () => {
    const unusedSolveRope = (over: Partial<SolvedBraceletResponse> = {}) => {
      settle();
      api.pending[0].next({
        status: 'success',
        value: solved({ beadCount: 26, isWithinTolerance: true, ...over }),
      });
      TestBed.tick();
    };

    it('holds the last solved rope while a newer solve is in flight', () => {
      answerRope(26);
      expect(store.rope()?.beadCount).toBe(26);

      store.wristMm.set(190);
      settle();

      expect(store.rope()?.beadCount).toBe(26);
      expect(store.isStale()).toBe(true);
    });

    /**
     * The regression this file exists for.
     *
     * `POST /bracelets/solve` shares a 10-per-minute bucket with reading
     * creation, so an ordinary designing session reaches 429 — and the first
     * version went null on any non-success, which took the whole design off the
     * screen.
     */
    it('holds the last solved rope when the next solve is rejected', () => {
      answerRope(26);

      store.wristMm.set(190);
      settle();
      api.pending[1].next({
        status: 'error',
        failure: {
          code: 'RATE_LIMITED',
          status: 429,
          detail: null,
          validationErrors: null,
          retryAfterSeconds: 60,
        },
      });
      TestBed.tick();

      expect(store.rope()?.beadCount).toBe(26);
      expect(store.isStale()).toBe(true);
    });

    /**
     * <b>Clearing the board does not clear the rope.</b>
     *
     * The rope belongs to the wrist and the bead size, not to the stones.
     * Dropping it on `reset` would blank the stage and spend a round trip to be
     * told the answer already held.
     */
    it('keeps the rope when the board is cleared', () => {
      answerRope(26);
      store.addBead('onyx');

      store.reset();

      expect(store.strand()).toEqual([]);
      expect(store.rope()?.beadCount).toBe(26);
      // Two requests make one rope, and clearing asked for neither.
      expect(api.requests).toHaveLength(2);
    });
  });

  /**
   * <b>The rope holds what it holds.</b>
   *
   * It is exactly the beads that fit the wrist, so there is genuinely no room for
   * another. Growing it would be the expansion the rope model exists to remove.
   */
  describe('filling the rope', () => {
    it('counts the places left', () => {
      answerRope(4);

      expect(store.ropeCapacity()).toBe(4);
      expect(store.remaining()).toBe(4);
      expect(store.isFull()).toBe(false);

      store.addBead('onyx');
      store.addBead('lava');

      expect(store.remaining()).toBe(2);
    });

    it('refuses a stone once every place is filled', () => {
      answerRope(3);

      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      expect(store.isFull()).toBe(true);

      store.addBead('onyx');

      expect(store.strand()).toHaveLength(3);
      expect(store.strand().map((p) => p.materialSlug)).toEqual(['onyx', 'lava', 'mica']);
    });

    it('makes room again when a stone is removed', () => {
      answerRope(3);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      store.removeBeadAt(1);
      expect(store.isFull()).toBe(false);

      store.addBead('agate');

      expect(store.strand().map((p) => p.materialSlug)).toEqual(['onyx', 'mica', 'agate']);
    });

    /**
     * Before the first rope has been solved there is no capacity to compare
     * against. Refusing then would make the designer unusable for the length of
     * one round trip; `isFull` is false until there is an answer.
     */
    it('does not call an unsolved rope full', () => {
      expect(store.ropeCapacity()).toBe(0);
      expect(store.isFull()).toBe(false);

      store.addBead('onyx');

      expect(store.strand()).toHaveLength(1);
    });
  });

  /**
   * <b>A shorter rope cannot hold what a longer one did.</b>
   *
   * Found by driving it: a bracelet full at 170 mm, switched to 130 mm, reported
   * "26 of 21". Five stones had nowhere to be — invisible, because the ring only
   * draws places that exist, but still in the strand, still counted and still
   * saveable. Neither keeping them nor dropping them quietly is honest, so they
   * are dropped and said out loud, through the undo the board's Clear already
   * uses.
   */
  /**
   * <b>A stone is named where the person read its name.</b>
   *
   * A `StrandPosition` carries a slug and the rope's slots carry the probe
   * material, so neither can say "Onyx". The palette can. Before this was wired
   * up every label on the ring fell back to the slug and read "1 / 26: onyx,
   * 8 mm" — found by reading the labels off a filled rope in the browser, not by
   * a test, because every fixture here names its stones after their slugs.
   */
  describe('naming the stones on the rope', () => {
    it('takes the name from the palette', () => {
      store.palette.set([
        { slug: 'onyx', name: 'Onyx', recommendation: {} } as DesignerStone,
        { slug: 'lava', name: 'Lava stone', recommendation: {} } as DesignerStone,
      ]);

      store.addBead('onyx');
      store.addBead('lava');

      expect(store.placedStones().map((s) => s.name)).toEqual(['Onyx', 'Lava stone']);
    });

    it('falls back to the slug rather than inventing a display string', () => {
      store.palette.set([]);
      store.addBead('onyx');

      expect(store.placedStones()[0].name).toBe('onyx');
    });

    it('carries the diameter each stone was placed at', () => {
      store.diameterMm.set(10);
      store.addBead('onyx');

      expect(store.placedStones()[0].diameterMm).toBe(10);
    });
  });

  describe('a rope that gets shorter', () => {
    /**
     * Answers the last request with a rope that describes what was asked.
     *
     * <b>Not `solved()` with a fixed wrist.</b> The store refuses to trim against
     * a rope that does not match the current wrist and bead size — that is what
     * stops it dropping the stones undo just restored — so a stub that always
     * answers "170 mm" would leave the trim permanently disabled and every test
     * here passing for the wrong reason.
     */

    it('drops the stones that no longer fit', () => {
      answerRope(4);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      store.addBead('agate');

      store.wristMm.set(130);
      answerRope(2);

      expect(store.strand().map((p) => p.materialSlug)).toEqual(['onyx', 'lava']);
    });

    it('offers them back, and says why they went', () => {
      answerRope(4);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      store.addBead('agate');
      const before = store.strand();

      store.wristMm.set(130);
      answerRope(2);

      expect(store.undoable()?.reason).toBe('shortened');
      expect(store.undoable()?.dropped).toBe(2);
      expect(store.undoable()?.strand).toBe(before);
    });

    it('leaves a strand that still fits alone', () => {
      answerRope(4);
      store.addBead('onyx');
      store.addBead('lava');
      const before = store.strand();

      store.wristMm.set(190);
      answerRope(6);

      expect(store.strand()).toBe(before);
      expect(store.undoable()).toBeNull();
    });

    it('drops a selection that fell off the end', () => {
      answerRope(4);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      store.selected.set(2);

      store.wristMm.set(130);
      answerRope(2);

      expect(store.selected()).toBeNull();
    });

    it('keeps a selection that is still on the rope', () => {
      answerRope(4);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      store.selected.set(0);

      store.wristMm.set(130);
      answerRope(2);

      expect(store.selected()).toBe(0);
    });

    /**
     * <b>Undo has to put the wrist back too.</b>
     *
     * Found by pressing it in the browser: the stones came back, the trim
     * dropped them again on the same tick, and the notice never went away. Undo
     * means "put back what I had", and what they had included a wrist that held
     * it.
     */
    it('puts back the size the stones fitted on', () => {
      answerRope(4);
      for (const slug of ['onyx', 'lava', 'mica', 'agate']) {
        store.addBead(slug);
      }
      const before = store.strand();

      store.wristMm.set(130);
      answerRope(2);
      expect(store.strand()).toHaveLength(2);

      store.undoReset();
      answerRope(4);

      expect(store.wristMm()).toBe(170);
      expect(store.strand()).toBe(before);
      expect(store.undoable()).toBeNull();
    });

    /** "26 of 21" must never be renderable. */
    it('never leaves more stones than places', () => {
      answerRope(4);
      for (const slug of ['onyx', 'lava', 'mica', 'agate']) {
        store.addBead(slug);
      }

      store.wristMm.set(130);
      answerRope(2);

      expect(store.strand().length).toBeLessThanOrEqual(store.ropeCapacity());
    });
  });

  describe('saving', () => {
    it('will not save a part-filled rope', () => {
      answerRope(3);
      store.addBead('onyx');
      store.addBead('lava');

      expect(store.canSave()).toBe(false);
    });

    it('saves once every place is filled', () => {
      answerRope(3);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      expect(store.canSave()).toBe(true);
    });

    it('will not save a rope the solver said does not fit', () => {
      answerRope(3, { isWithinTolerance: false });
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      expect(store.canSave()).toBe(false);
    });

    it('will not save while the rope is stale', () => {
      answerRope(3);
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');
      expect(store.canSave()).toBe(true);

      store.wristMm.set(190);
      settle();

      expect(store.canSave()).toBe(false);
    });
  });

  /**
   * <b>The view never reaches the solver.</b>
   *
   * Zoom and rotation are not the wrist and not the bead size. This asserts it
   * from the store's side: the signals the pipeline watches are the only ones
   * that can produce a request, so a view transform wired into any of them would
   * show here as a call count that climbs while nothing about the bracelet
   * changed.
   */
  describe('the view cannot cause a solve', () => {
    it('reading the design a hundred times asks nothing', () => {
      settle();
      expect(api.requests).toHaveLength(1);

      for (let i = 0; i < 100; i++) {
        void store.strand();
        void store.rope();
        void store.placedStones();
      }

      settle();

      expect(api.requests).toHaveLength(1);
    });

    it('the wrist does cause one, so the test above is not vacuous', () => {
      settle();

      store.wristMm.set(190);
      settle();

      expect(api.requests).toHaveLength(2);
    });
  });

  /**
   * The save payload, key by key.
   *
   * Snapshotting the key set rather than the values is deliberate: the values are
   * covered elsewhere, and what this catches is a *new* key — a zoom, a rotation,
   * a scroll offset — arriving in a body that is supposed to describe a physical
   * object. Anything the customer's browser was doing at the time is not part of
   * the bracelet.
   */
  it('saves the design and nothing about the view', () => {
    store.addBead('onyx');
    store.addBead('lava');
    store.addBead('mica');
    settle();

    store.save('session-1');

    const body = api.configured as Record<string, unknown>;

    expect(Object.keys(body).sort()).toEqual([
      'beads',
      'recommendationSessionId',
      'strand',
      'templateSlug',
      'wristCircumferenceMm',
    ]);
  });

  /**
   * Clearing, and putting it back.
   */
  describe('reset and undo', () => {
    it('keeps the strand it emptied, by identity', () => {
      store.addBead('onyx');
      store.addBead('lava');

      const before = store.strand();

      store.reset();

      expect(store.strand()).toEqual([]);
      expect(store.undoable()?.strand).toBe(before);
      expect(store.undoable()?.reason).toBe('cleared');
    });

    it('undo puts back exactly what was there', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      const before = store.strand();

      store.reset();
      store.undoReset();

      // The same array, not a copy that happens to match.
      expect(store.strand()).toBe(before);
      expect(store.undoable()).toBeNull();
    });

    it('offers nothing when there was nothing to lose', () => {
      store.reset();

      expect(store.undoable()).toBeNull();
    });

    it('forgetting the offer leaves the strand alone', () => {
      store.addBead('onyx');
      store.reset();
      store.forgetUndo();
      store.undoReset();

      expect(store.undoable()).toBeNull();
      expect(store.strand()).toEqual([]);
    });

    it('a second clear replaces the offer rather than stacking it', () => {
      store.addBead('onyx');
      store.reset();

      store.addBead('lava');
      const second = store.strand();
      store.reset();

      expect(store.undoable()?.strand).toBe(second);
    });
  });

  describe('save', () => {
    it('posts the strand and the reading it came from', () => {
      store.addBead('onyx');
      store.addBead('lava');
      store.addBead('mica');

      store.save('session-7');
      TestBed.tick();

      expect(api.configured).toMatchObject({
        templateSlug: 'single-strand-elastic',
        wristCircumferenceMm: 170,
        beads: [],
        recommendationSessionId: 'session-7',
      });
      expect(store.saved()?.publicId).toBe('cfg-9');
    });

    it('does not post an empty strand', () => {
      store.save('session-7');
      TestBed.tick();

      expect(api.configured).toBeNull();
    });
  });

  describe('the options offered', () => {
    // Fully typed rather than cast: an earlier draft of this fixture spelled the
    // wrist bounds `minWristMm`, a cast swallowed it, and both tests asserted
    // against an empty list that the store was right to return.
    const sizing = (over: Partial<BeadSizingResponse> = {}): BeadSizingResponse => ({
      beadDiametersMm: [8],
      wristMinMm: 130,
      wristMaxMm: 145,
      wristStepMm: 5,
      elasticEaseMm: 0,
      fitToleranceMm: 5,
      grades: ['Standard', 'Premium'],
      status: 'PROVISIONAL',
      openQuestion: 'Q-8',
      ...over,
    });

    it('offers only diameters the template and the sizing table both allow', () => {
      store.sizing.set(sizing({ beadDiametersMm: [8, 10, 14] }));

      // 14 is in the table and not in the template. Offering it would fail on save.
      expect(store.availableDiameters()).toEqual([8, 10]);
    });

    it('walks the wrist range by the table step', () => {
      store.sizing.set(sizing());

      expect(store.wristOptions()).toEqual([130, 135, 140, 145]);
    });
  });
});
