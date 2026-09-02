import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { BraceletsApiService } from '@core/api/bracelets-api.service';
import { isSuccess, success, type RequestState } from '@core/api/request-state';
import type { BeadGrade } from '@core/models/api-enums';
import type {
  BeadSelection,
  BeadSizingResponse,
  BraceletTemplateResponse,
  ConfiguredBeadSlot,
  ConfiguredBraceletResponse,
  SolvedBraceletResponse,
  StrandPosition,
} from '@core/models/bracelets.models';
import type { CustomerRecommendation } from '@core/models/gemstones.models';
import {
  autoArrangeStrand,
  calculateCustomBraceletPrice,
  type CustomBraceletPriceBreakdown,
  type SavedBracelet,
} from '@core/models/saved-bracelet.models';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';

import type { PlacedStone } from './strand/strand-geometry';

export const DEFAULT_TEMPLATE: BraceletTemplateResponse = {
  publicId: 'tpl-single-strand',
  slug: 'single-strand',
  nameKey: 'STONECRAFT.TEMPLATES.SINGLE_STRAND',
  allowedDiametersMm: [6, 8, 10, 12],
  minBeadCount: 12,
  maxBeadCount: 36,
  lockedStoneTier: null,
};

export const DEFAULT_SIZING: BeadSizingResponse = {
  beadDiametersMm: [6, 8, 10, 12],
  wristMinMm: 140,
  wristMaxMm: 210,
  wristStepMm: 5,
  elasticEaseMm: 10,
  fitToleranceMm: 4,
  grades: ['Standard', 'Premium'],
  status: 'PROVISIONAL',
  openQuestion: 'Q-8',
};



/**
 * A strand that can be put back, and why it went.
 */
export interface Undoable {
  readonly strand: readonly StrandPosition[];
  readonly reason: 'cleared' | 'shortened';
  /** How many stones fell off the end. Only meaningful when `shortened`. */
  readonly dropped?: number;
  readonly wristMm: number;
  readonly diameterMm: number;
}

/** What a rope request is made of. */
interface RopeRequest {
  readonly templateSlug: string | null;
  readonly wristCircumferenceMm: number;
  readonly fillerDiameterMm: number;
  readonly grade: BeadGrade;
  readonly placed: readonly StrandPosition[];
}

/**
 * What makes two rope requests the same question.
 */
const ropeKey = (request: RopeRequest): string =>
  [
    request.templateSlug,
    request.wristCircumferenceMm,
    request.fillerDiameterMm,
    request.grade,
    request.placed
      .map((position) => position.diameterMm)
      .filter((diameterMm) => diameterMm !== request.fillerDiameterMm)
      .sort((a, b) => a - b)
      .join(','),
  ].join('|');

/**
 * The demand that asks how many beads of this mix fit.
 */
const demandFor = (request: RopeRequest): BeadSelection[] => {
  const hasMixedDiameters = request.placed.some(
    (position) => position.diameterMm !== request.fillerDiameterMm,
  );

  if (!hasMixedDiameters) {
    return [
      {
        materialSlug: ROPE_PROBE_SLUG,
        diameterMm: request.fillerDiameterMm,
        grade: request.grade,
      },
    ];
  }

  const byDiameter = new Map<number, number>();

  for (const position of request.placed) {
    if (position.diameterMm !== request.fillerDiameterMm) {
      byDiameter.set(position.diameterMm, (byDiameter.get(position.diameterMm) ?? 0) + 1);
    }
  }

  const demand: BeadSelection[] = [...byDiameter].map(([diameterMm, minimumCount]) => ({
    materialSlug: ROPE_PROBE_SLUG,
    diameterMm,
    grade: request.grade,
    minimumCount,
  }));

  // The filler last, with no minimum, so it takes up whatever is left.
  demand.push({
    materialSlug: ROPE_PROBE_SLUG,
    diameterMm: request.fillerDiameterMm,
    grade: request.grade,
    minimumCount: 1,
  });

  return demand;
};

/** A stone the person's chart named, ready for the palette. */
export interface DesignerStone {
  readonly recommendation: CustomerRecommendation;
  readonly slug: string;
  readonly name: string;
}

/** Milliseconds of quiet before a solve goes out. */
const SOLVE_DEBOUNCE_MS = 120;

/**
 * The material sent to ask the solver how long the rope is.
 */
const ROPE_PROBE_SLUG = 'onyx';

/**
 * The bracelet being designed. One store, signals, one source of truth.
 */
@Injectable()
export class BraceletDesignStore {
  private readonly api = inject(BraceletsApiService);
  private readonly savedBraceletsService = inject(SavedBraceletsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly template = signal<BraceletTemplateResponse | null>(DEFAULT_TEMPLATE);
  readonly sizing = signal<BeadSizingResponse | null>(DEFAULT_SIZING);
  readonly palette = signal<readonly DesignerStone[]>([]);

  readonly braceletId = signal<string | null>(null);
  readonly braceletName = signal<string>('');
  readonly spacerStyle = signal<'none' | 'gold' | 'silver' | 'hematite'>('none');

  readonly wristMm = signal<number>(170);
  readonly diameterMm = signal<number>(8);
  readonly grade = signal<BeadGrade>('Standard');

  /** THE design. */
  readonly strand = signal<readonly StrandPosition[]>([]);

  readonly selected = signal<number | null>(null);

  readonly saved = signal<ConfiguredBraceletResponse | null>(null);
  readonly saving = signal<RequestState<ConfiguredBraceletResponse>>({ status: 'idle' });

  /**
   * Live price calculation updated immediately on any change.
   */
  readonly livePriceBreakdown = computed<CustomBraceletPriceBreakdown>(() =>
    calculateCustomBraceletPrice(
      this.strand(),
      this.diameterMm(),
      this.grade(),
      this.spacerStyle(),
    ),
  );

  readonly livePrice = computed(() => this.livePriceBreakdown().totalPrice);

  /**
   * The solved rope geometry.
   */
  readonly solved = toSignal(
    toObservable(
      computed(() => ({
        templateSlug: this.template()?.slug ?? null,
        wristCircumferenceMm: this.wristMm(),
        fillerDiameterMm: this.diameterMm(),
        grade: this.grade(),
        placed: this.strand(),
      })),
    ).pipe(
      distinctUntilChanged((a, b) => ropeKey(a) === ropeKey(b)),
      debounceTime(SOLVE_DEBOUNCE_MS),
      switchMap((request) => {
        if (request.templateSlug === null) {
          return of({ status: 'idle' } as RequestState<SolvedBraceletResponse>);
        }

        const templateSlug = request.templateSlug;

        // 1. How many places are there, for this mix on this wrist?
        return this.api
          .solve({
            templateSlug,
            wristCircumferenceMm: request.wristCircumferenceMm,
            beads: demandFor(request),
          })
          .pipe(
            switchMap((counted) => {
              if (!isSuccess(counted)) {
                return of(counted);
              }

              const fillers = Math.max(0, counted.value.beadCount - request.placed.length);

              // 2. Where does each one sit, in the order the person chose?
              return this.api.solve({
                templateSlug,
                wristCircumferenceMm: request.wristCircumferenceMm,
                beads: [],
                strand: [
                  ...request.placed.slice(0, counted.value.beadCount),
                  ...Array.from({ length: fillers }, () => ({
                    materialSlug: ROPE_PROBE_SLUG,
                    diameterMm: request.fillerDiameterMm,
                    grade: request.grade,
                  })),
                ],
              });
            }),
          );
      }),
    ),
    { initialValue: { status: 'idle' } as RequestState<SolvedBraceletResponse> },
  );

  private readonly lastRope = signal<SolvedBraceletResponse | null>(null);

  private readonly retainSolved = effect(() => {
    const state = this.solved();
    if (isSuccess(state)) {
      this.lastRope.set(state.value);
    }
  });

  readonly rope = this.lastRope.asReadonly();

  readonly ropeCapacity = computed(() => this.rope()?.beadCount ?? 0);

  readonly remaining = computed(() => Math.max(0, this.ropeCapacity() - this.strand().length));

  readonly isFull = computed(
    () => this.ropeCapacity() > 0 && this.strand().length >= this.ropeCapacity(),
  );

  readonly isStale = computed(() => {
    const state = this.solved();
    return state.status === 'loading' || state.status === 'error';
  });

  readonly canSave = computed(() => {
    const rope = this.rope();
    return rope !== null && rope.isWithinTolerance && this.isFull() && isSuccess(this.solved());
  });

  readonly placedStones = computed<readonly PlacedStone[]>(() => {
    const names = new Map(this.palette().map((stone) => [stone.slug, stone.name]));

    return this.strand().map((position) => ({
      slug: position.materialSlug,
      name: names.get(position.materialSlug) ?? position.materialSlug,
      diameterMm: position.diameterMm,
    }));
  });

  private readonly trimToRope = effect(() => {
    const rope = this.rope();

    if (rope === null) {
      return;
    }

    const describesNow =
      rope.wristCircumferenceMm === this.wristMm() &&
      (rope.slots[0]?.diameterMm ?? this.diameterMm()) === this.diameterMm();

    if (!describesNow) {
      return;
    }

    const capacity = rope.beadCount;

    if (capacity === 0) {
      return;
    }

    const current = this.strand();

    if (current.length <= capacity) {
      this.heldAt = {
        wristMm: rope.wristCircumferenceMm,
        diameterMm: rope.slots[0]?.diameterMm ?? this.diameterMm(),
      };
      return;
    }

    this.undoable.set({
      strand: current,
      reason: 'shortened',
      dropped: current.length - capacity,
      ...this.heldAt,
    });

    this.strand.set(current.slice(0, capacity));
    this.selected.update((selected) =>
      selected !== null && selected >= capacity ? null : selected,
    );
  });

  private heldAt = { wristMm: 170, diameterMm: 8 };

  readonly availableDiameters = computed<readonly number[]>(() => {
    const template = this.template();
    const sizing = this.sizing();

    if (template !== null && sizing !== null) {
      const allowed = sizing.beadDiametersMm.filter((d) => template.allowedDiametersMm.includes(d));
      if (allowed.length > 0) return allowed;
    }

    if (sizing !== null && sizing.beadDiametersMm.length > 0) {
      return sizing.beadDiametersMm;
    }

    return [6, 8, 10, 12];
  });

  readonly wristOptions = computed<readonly number[]>(() => {
    const sizing = this.sizing();
    if (sizing !== null && sizing.wristMaxMm > sizing.wristMinMm) {
      const out: number[] = [];
      for (let mm = sizing.wristMinMm; mm <= sizing.wristMaxMm; mm += sizing.wristStepMm) {
        out.push(mm);
      }
      return out;
    }

    return [150, 160, 170, 180, 190, 200, 210];
  });

  // ── Mutations. ────────────────────────────────────────────────────────────

  addBead(slug: string): void {
    if (this.isFull()) {
      return;
    }

    this.strand.update((current) => [...current, this.position(slug)]);
  }

  replaceBeadAt(index: number, slug: string): void {
    this.strand.update((current) =>
      current.map((position, i) => (i === index ? this.position(slug) : position)),
    );
  }

  removeBeadAt(index: number): void {
    this.strand.update((current) => current.filter((_, i) => i !== index));
    this.selected.update((selected) => {
      if (selected === null) return null;
      if (selected === index) return null;
      return selected > index ? selected - 1 : selected;
    });
  }

  moveBead(from: number, to: number): void {
    this.strand.update((current) => {
      if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    this.selected.set(to);
  }

  /**
   * Auto-arranges the currently placed beads into a symmetrical, harmonious pattern.
   */
  autoArrange(): void {
    const arranged = autoArrangeStrand(this.strand());
    this.strand.set(arranged);
  }

  /**
   * Applies an initial preset strand composition.
   */
  applyPreset(presetStrand: readonly StrandPosition[]): void {
    this.strand.set(presetStrand);
  }

  /**
   * Loads a saved bracelet into the active workspace.
   */
  loadSavedBracelet(saved: SavedBracelet): void {
    this.braceletId.set(saved.id);
    this.braceletName.set(saved.name);
    this.wristMm.set(saved.wristMm);
    this.diameterMm.set(saved.diameterMm);
    this.grade.set(saved.grade);
    this.spacerStyle.set(saved.spacerStyle || 'none');
    this.strand.set([...saved.strand]);
    this.selected.set(null);
    this.savedBraceletsService.setActive(saved.id);
  }

  /**
   * Empties the bracelet.
   */
  reset(): void {
    const previous = this.strand();

    this.undoable.set(
      previous.length > 0
        ? {
            strand: previous,
            reason: 'cleared',
            wristMm: this.wristMm(),
            diameterMm: this.diameterMm(),
          }
        : null,
    );

    this.strand.set([]);
    this.selected.set(null);
    this.saved.set(null);
    this.saving.set({ status: 'idle' });
  }

  readonly undoable = signal<Undoable | null>(null);

  undoReset(): void {
    const previous = this.undoable();

    if (previous === null) {
      return;
    }

    this.undoable.set(null);

    this.wristMm.set(previous.wristMm);
    this.diameterMm.set(previous.diameterMm);
    this.strand.set(previous.strand);
  }

  forgetUndo(): void {
    this.undoable.set(null);
  }

  /**
   * Persists the design locally and to backend.
   */
  save(sessionPublicId: string | null): SavedBracelet | null {
    if (this.strand().length === 0) {
      return null;
    }

    // Save to local SavedBraceletsService immediately
    const stoneNames = new Map(this.palette().map((s) => [s.slug, s.name]));
    const savedLocal = this.savedBraceletsService.saveBracelet({
      id: this.braceletId(),
      name: this.braceletName() || undefined,
      readingPublicId: sessionPublicId || 'guest',
      strand: this.strand(),
      wristMm: this.wristMm(),
      diameterMm: this.diameterMm(),
      grade: this.grade(),
      spacerStyle: this.spacerStyle(),
      stoneNames,
    });

    this.braceletId.set(savedLocal.id);
    this.braceletName.set(savedLocal.name);

    const template = this.template();
    if (template !== null) {
      this.saving.set({ status: 'loading' });

      this.api
        .configure({
          templateSlug: template.slug,
          wristCircumferenceMm: this.wristMm(),
          beads: [],
          strand: this.strand(),
          recommendationSessionId: sessionPublicId,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((state) => {
          this.saving.set(state);
          if (isSuccess(state)) {
            this.saved.set(state.value);
          }
        });
    }

    return savedLocal;
  }

  private position(slug: string): StrandPosition {
    return { materialSlug: slug, diameterMm: this.diameterMm(), grade: this.grade() };
  }
}

export const MINIMUM_RING_BEADS = 3;
