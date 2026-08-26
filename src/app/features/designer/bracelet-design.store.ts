import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { BraceletsApiService } from '@core/api/bracelets-api.service';
import { isSuccess, type RequestState } from '@core/api/request-state';
import type { BeadGrade } from '@core/models/api-enums';
import type {
  BeadSelection,
  BeadSizingResponse,
  BraceletTemplateResponse,
  ConfiguredBraceletResponse,
  SolvedBraceletResponse,
  StrandPosition,
} from '@core/models/bracelets.models';
import type { CustomerRecommendation } from '@core/models/gemstones.models';

import type { PlacedStone } from './strand/strand-geometry';

/**
 * A strand that can be put back, and why it went.
 *
 * The reason is carried rather than inferred because the two cases need
 * different words: a board somebody cleared on purpose, and stones dropped by a
 * rope that got shorter underneath them.
 */
export interface Undoable {
  readonly strand: readonly StrandPosition[];
  readonly reason: 'cleared' | 'shortened';
  /** How many stones fell off the end. Only meaningful when `shortened`. */
  readonly dropped?: number;
  /**
   * The size the strand fitted on.
   *
   * <b>Undo has to put this back too, or it cannot work at all.</b> Stones are
   * dropped because the rope got shorter; restoring them onto the short rope
   * just drops them again, and the button does nothing twice. Found by pressing
   * it: the notice stayed, the count stayed, nothing moved. Undo means "put back
   * what I had", and what they had included a wrist that held it.
   */
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
 *
 * <b>The sequence of diameters, not the stones.</b> Swapping a stone for another
 * of the same size, or adding one in the size already being used, does not change
 * the shape of the rope by one micrometre — a filler becomes a real bead in the
 * same place. Keying on the strand itself would ask the solver the same question
 * twenty-six times and get the same answer.
 */
const ropeKey = (request: RopeRequest): string =>
  [
    request.templateSlug,
    request.wristCircumferenceMm,
    request.fillerDiameterMm,
    request.grade,
    /*
      Only the placed sizes that DIFFER from the filler.

      A stone the same size as the filler does not change the rope at all — it
      takes the place a filler was already holding, and the sequence of diameters
      round the ring is identical before and after. Counting it would ask the
      solver the same question again for every bead placed, which is the per-bead
      solve the rope model exists to remove.

      Sorted, because a rope of 8s and 10s is the same rope whichever order they
      went on: the radius across four arrangements of the same 25 beads varied by
      0.04%, all within tolerance.
    */
    request.placed
      .map((position) => position.diameterMm)
      .filter((diameterMm) => diameterMm !== request.fillerDiameterMm)
      .sort((a, b) => a - b)
      .join(','),
  ].join('|');

/**
 * The demand that asks how many beads of this mix fit.
 *
 * One selection per distinct diameter already placed, carrying how many of that
 * size there are, plus one for the filler so the solver has something to finish
 * the ring with. Identity is irrelevant to the count and is discarded.
 */
const demandFor = (request: RopeRequest): BeadSelection[] => {
  const byDiameter = new Map<number, number>();

  for (const position of request.placed) {
    byDiameter.set(position.diameterMm, (byDiameter.get(position.diameterMm) ?? 0) + 1);
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
 *
 * <b>A probe, not a choice.</b> The demand path needs some material to fill the
 * ring with before it will answer; ring geometry depends only on the diameters,
 * so which one is asked about does not change the answer. Named here so there is
 * exactly one place it exists, and so the test that proves it never reaches the
 * screen has something to name.
 *
 * It must be a slug the catalogue actually stocks, or the solve 400s.
 */
const ROPE_PROBE_SLUG = 'onyx';

/**
 * The bracelet being designed. One store, signals, one source of truth.
 *
 * <b>`strand` is the design.</b> Everything else is derived from it: the ring,
 * the counts, the review, what gets saved. Every mutation writes `strand` and
 * nothing else, which is what makes "undo by replacing the array" possible and
 * what stops two places disagreeing about what the bracelet contains.
 *
 * The palette is the person's own `recommendations[]` (D21) — there is no
 * explore section and no whole-catalogue fallback, because a designer without a
 * chart has no palette.
 */
@Injectable()
export class BraceletDesignStore {
  private readonly api = inject(BraceletsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly template = signal<BraceletTemplateResponse | null>(null);
  readonly sizing = signal<BeadSizingResponse | null>(null);
  readonly palette = signal<readonly DesignerStone[]>([]);

  readonly wristMm = signal<number>(170);
  readonly diameterMm = signal<number>(8);
  readonly grade = signal<BeadGrade>('Standard');

  /** THE design. */
  readonly strand = signal<readonly StrandPosition[]>([]);

  readonly selected = signal<number | null>(null);

  readonly saved = signal<ConfiguredBraceletResponse | null>(null);
  readonly saving = signal<RequestState<ConfiguredBraceletResponse>>({ status: 'idle' });

  /**
   * <b>The rope: the bracelet that fits this wrist, with the places still to fill.</b>
   *
   * The design used to be solved bead by bead, so the ring grew as stones were
   * added and a half-built bracelet reported a fit of −176 mm. A bracelet is not
   * built that way. It is a rope of a fixed length — set by the wrist — with
   * places on it, and choosing stones fills those places.
   *
   * <b>Two requests, because beads may differ in size.</b> How many beads close a
   * ring depends on their diameters, and the person may mix them: a 6 mm stone
   * next to a 10 mm one. So
   *
   *   1. the demand path answers "how many beads of this mix fit this wrist",
   *      which is the backend's rule and never ours; then
   *   2. the strand path is asked for that many, IN THE PERSON'S ORDER, which is
   *      the only way to get the true centres — with mixed diameters the angular
   *      step between two beads depends on both of them, so the places are not a
   *      fixed set that any arrangement can be poured into.
   *
   * Splitting it is safe because the count barely moves with order: the same 25
   * beads rearranged four ways solved to R = 32.874…32.886, a spread of 0.04%,
   * every one within tolerance. Measured, not assumed.
   *
   * <b>It does not fire per stone.</b> The request is keyed on the SEQUENCE of
   * diameters — what is placed, then the filler — so adding a stone of the size
   * already being used changes nothing: a filler simply becomes a real stone in
   * the same place. Twenty-six same-size beads cost zero solves. Only changing
   * the wrist, or mixing in a different size, asks anything.
   *
   * <b>The fillers' material is a probe and is discarded.</b> See
   * `ROPE_PROBE_SLUG` and `rope-is-geometry-only.spec.ts`.
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
                  ...request.placed,
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

  /**
   * The rope to draw, or null while there has never been one.
   *
   * <b>It holds the last solved rope; it does not go null on `loading` or on
   * `error`.</b> The first version read `isSuccess(state) ? state.value : null`,
   * which contradicted the intent stated on `isStale` below: every solve took
   * the bracelet off the screen and put it back, and a rate-limited solve took
   * it off and left it off — a person who had placed thirty beads watched the
   * whole design vanish. Found by driving it.
   *
   * Retaining it is only safe because `isStale` is published beside it. A
   * retained ring that is presented as current *is* the wrong bracelet drawn
   * silently, so the two must stay wired to the same stage.
   */
  private readonly lastRope = signal<SolvedBraceletResponse | null>(null);

  /*
    An effect rather than a `linkedSignal` over `solved`. `linkedSignal` computes
    lazily, so its "previous value" is only there if something read it between
    the two states — retention that depends on whether anyone happened to look.
    A test caught exactly that: succeed, then fail without reading in between,
    and the ring came back null. An effect runs on every change regardless.
  */
  private readonly retainSolved = effect(() => {
    const state = this.solved();
    if (isSuccess(state)) {
      this.lastRope.set(state.value);
    }
  });

  readonly rope = this.lastRope.asReadonly();

  /**
   * How many stones this rope holds. Zero until the first solve lands.
   *
   * <b>Never computed here.</b> It is the solver's answer to "how many beads of
   * this diameter close a ring on this wrist", and a second implementation would
   * disagree with the one that validates the save.
   */
  readonly ropeCapacity = computed(() => this.rope()?.beadCount ?? 0);

  /** Places still free. */
  readonly remaining = computed(() => Math.max(0, this.ropeCapacity() - this.strand().length));

  /**
   * <b>The rope is full.</b>
   *
   * Not "too long" — full. The rope holds exactly the beads that fit the wrist,
   * so there is genuinely no room for another, and the way to get a longer one is
   * a bigger wrist or a smaller bead. `addBead` refuses rather than growing, and
   * the palette says so instead of silently doing nothing.
   */
  readonly isFull = computed(
    () => this.ropeCapacity() > 0 && this.strand().length >= this.ropeCapacity(),
  );

  /**
   * True when the drawn rope is not known to match the current wrist and size.
   *
   * The stage dims; it does not clear and does not spin. A ring that redraws
   * 120 ms late reads as considered; one that flickers empty reads as broken.
   * Covers the errored solve as well as the in-flight one, because a stale ring
   * that stopped updating needs the same visual caveat as one still updating.
   */
  readonly isStale = computed(() => {
    const state = this.solved();
    return state.status === 'loading' || state.status === 'error';
  });

  /**
   * <b>Save when the rope is full, and not before.</b>
   *
   * `isWithinTolerance` is the rope's, which is the bracelet that will be strung
   * — so it is true from the first stone, and the thing that gates saving is
   * whether every place has been filled. A part-filled rope is not a bracelet.
   */
  readonly canSave = computed(() => {
    const rope = this.rope();
    return rope !== null && rope.isWithinTolerance && this.isFull() && isSuccess(this.solved());
  });

  /**
   * The chosen stones with their names, ready for the rope.
   *
   * The name comes from the palette — where the person read it — because a
   * `StrandPosition` carries a slug and the rope's slots carry the probe's name.
   * Falls back to the slug rather than inventing a display string.
   */
  readonly placedStones = computed<readonly PlacedStone[]>(() => {
    const names = new Map(this.palette().map((stone) => [stone.slug, stone.name]));

    return this.strand().map((position) => ({
      slug: position.materialSlug,
      name: names.get(position.materialSlug) ?? position.materialSlug,
      diameterMm: position.diameterMm,
    }));
  });

  /*
    A SHORTER ROPE CANNOT HOLD WHAT A LONGER ONE DID.

    Changing to a smaller wrist, or a bigger bead, gives a rope with fewer places
    — and the stones past the end have nowhere to be. Before this, they stayed in
    `strand`: invisible, because the ring only draws places that exist, but still
    counted, still saved, and reported as "26 of 21", which is not a sentence
    about anything.

    Silence in either direction is wrong here. Keeping them means saving a
    bracelet with stones nobody can see; dropping them without a word means
    losing somebody's work because they tried a different wrist size. So they are
    dropped and said out loud, through the same undo the board's Clear uses — the
    offer already exists, and a second mechanism for "that removed something, put
    it back" would be a second thing to get wrong.
  */
  private readonly trimToRope = effect(() => {
    /*
      ONLY AGAINST A ROPE THAT DESCRIBES THE CURRENT WRIST AND BEAD SIZE.

      "Has it answered?" is not the question — a settled rope can still be the
      previous one. Undo restores the wrist and the strand on the same tick, and
      the replacement rope is a round trip away; in that window the old, settled,
      shorter rope would drop the very stones undo just put back, and the button
      would do nothing at all. It did exactly that until this compared the rope
      to what it is supposed to describe rather than to whether it arrived.
    */
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
      /*
        Remember the size this strand fits on, taken from the rope.

        Reading the live signals here would give the same answer today — the
        guard above has already established that the rope describes them — and
        mutation testing says so: swapping this for `wristMm()` breaks nothing.
        It is written this way because the pair and the count it belongs to come
        out of one object and cannot drift apart, which stops being merely tidy
        the moment that guard is ever relaxed.
      */
      this.heldAt = {
        wristMm: rope.wristCircumferenceMm,
        diameterMm: rope.slots[0]?.diameterMm ?? this.diameterMm(),
      };

      return;
    }

    /*
      The size RECORDED, not the size now.

      By the time this runs the wrist has already changed — that is why the rope
      is shorter. Offering to undo back to the CURRENT wrist would restore the
      stones onto the rope that cannot hold them, and they would be dropped again
      on the same tick, which is what the button did before this.
    */
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

  /** The last wrist and bead size the whole strand fitted on. */
  private heldAt = { wristMm: 170, diameterMm: 8 };

  /** Diameters this template and the sizing table both offer. */
  readonly availableDiameters = computed<readonly number[]>(() => {
    const template = this.template();
    const sizing = this.sizing();

    if (template === null || sizing === null) {
      return [];
    }

    // Intersection, not either alone: a template may accept fewer diameters than
    // the catalogue stocks, and offering one it rejects fails only on save.
    return sizing.beadDiametersMm.filter((d) => template.allowedDiametersMm.includes(d));
  });

  readonly wristOptions = computed<readonly number[]>(() => {
    const sizing = this.sizing();
    if (sizing === null) {
      return [];
    }

    const out: number[] = [];
    for (let mm = sizing.wristMinMm; mm <= sizing.wristMaxMm; mm += sizing.wristStepMm) {
      out.push(mm);
    }
    return out;
  });

  // ── Mutations. Each writes `strand` and nothing else. ────────────────────

  /**
   * Puts a stone in the next free place, if there is one.
   *
   * Refuses rather than growing the rope: see `isFull`. Silent here because the
   * palette is where a person is looking when they try, and that is where the
   * message belongs.
   */
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

  /**
   * Moves one bead to another position, keeping the rest in order.
   *
   * Selection follows the bead rather than the index — a person who moves the
   * stone they are looking at expects to still be looking at it.
   */
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
   * Empties the bracelet.
   *
   * <b>One implementation, two controls.</b> "Start over" in the review panel and
   * "Clear" on the board both land here — a second emptying path would be a
   * second place for undo to be forgotten. There is a test counting the call
   * sites, in the same family as the one that counts the ways a bead can be
   * placed.
   */
  reset(): void {
    // Kept for undo BEFORE anything is cleared, and only when there is something
    // to keep: an empty strand offering to be restored is noise.
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

    // The rope is NOT cleared. It belongs to the wrist and the bead size, not to
    // the stones — emptying the board leaves the same bracelet to fill again, and
    // clearing it would blank the stage and spend a round trip to get back the
    // answer already held.
  }

  /**
   * The strand as it was before the last `reset`, until the offer expires.
   *
   * <b>Undo rather than a confirmation, deliberately.</b> A 28-bead bracelet is
   * twenty minutes of somebody's evening and there is no way back today. A dialog
   * gets clicked through — it is a tax on everyone who meant it, paid so the one
   * person who did not is asked a question they will answer wrongly at speed. An
   * undo costs nothing to the first group and actually saves the second.
   */
  readonly undoable = signal<Undoable | null>(null);

  /** Puts back exactly what `reset` took. */
  undoReset(): void {
    const previous = this.undoable();

    if (previous === null) {
      return;
    }

    this.undoable.set(null);

    // The size first: the strand is only valid on the rope it came off.
    this.wristMm.set(previous.wristMm);
    this.diameterMm.set(previous.diameterMm);
    this.strand.set(previous.strand);
  }

  forgetUndo(): void {
    this.undoable.set(null);
  }

  /** Saves. The terminal action — there is no handoff call and no new endpoint (D14). */
  save(sessionPublicId: string | null): void {
    const template = this.template();
    if (template === null || this.strand().length === 0) {
      return;
    }

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

  /** Applies the current size and grade to a slug. */
  private position(slug: string): StrandPosition {
    return { materialSlug: slug, diameterMm: this.diameterMm(), grade: this.grade() };
  }
}

/**
 * Three beads is the fewest that can close a ring.
 *
 * Mirrors `StrandRadiusSolver.MinimumBeads`. Below it the backend answers
 * `GEOMETRY_DEGENERATE`, correctly — two beads are a line segment, not a ring —
 * so the client does not ask.
 */
export const MINIMUM_RING_BEADS = 3;
