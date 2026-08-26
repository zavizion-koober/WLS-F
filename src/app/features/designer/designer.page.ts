import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { BraceletsApiService } from '@core/api/bracelets-api.service';
import { isRetryable } from '@core/api/api-failure';
import { isSuccess } from '@core/api/request-state';
import type { BeadGrade } from '@core/models/api-enums';
import type { CustomerRecommendation } from '@core/models/gemstones.models';
import { ReadingStore } from '@features/reading/reading.store';
import { ApiErrorComponent } from '@shared/components/api-error.component';
import { ScLoadingSkeletonComponent } from '@shared/components/sc-loading-skeleton.component';

import { BraceletDesignStore } from './bracelet-design.store';
import { DesignControlsComponent } from './controls/design-controls.component';
import { CautionGateComponent } from './palette/caution-gate.component';
import { PalettePanelComponent } from './palette/palette-panel.component';
import { StrandViewComponent } from './strand/strand-view.component';

/**
 * The bracelet designer.
 *
 * <b>It requires a reading.</b> `/designer` redirects to `/reading`; this route
 * takes the session's opaque `publicId`, exactly as `/reading/:publicId` does,
 * and no birth data appears in it. A designer without a chart has no palette
 * (D21) — there is no fallback that shows the whole catalogue.
 */
@Component({
  selector: 'sc-designer-page',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    ApiErrorComponent,
    ScLoadingSkeletonComponent,
    StrandViewComponent,
    PalettePanelComponent,
    CautionGateComponent,
    DesignControlsComponent,
  ],
  providers: [BraceletDesignStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="atelier-container py-10 md:py-14">
      <header>
        <p class="text-eyebrow text-[var(--gold-muted)]">
          {{ 'STONECRAFT.NAV.DESIGNER' | translate }}
        </p>
        <h1 class="font-display text-page-title mt-3 text-[var(--brand-green)]">
          {{ 'STONECRAFT.DESIGNER.TITLE' | translate }}
        </h1>
        <div class="gold-rule mt-6 max-w-xl"></div>
      </header>

      @if (reading.isLoading()) {
        <div class="mt-10 space-y-4" aria-busy="true">
          <sc-loading-skeleton height="360px" customClass="rounded-lg max-w-xl" />
        </div>
      } @else if (reading.failure(); as failure) {
        <div class="mt-10 max-w-xl">
          <sc-api-error [failure]="failure" [retryable]="canRetry()" (retry)="load()" />
        </div>
      } @else if (result(); as session) {
        <div class="designer-grid mt-8">
          <!--
            THE ROPE, from the first moment there is one.

            It used to be three states: an open row under three beads, a ring once
            the strand had been solved, and a skeleton in between. All three
            existed because the ring was solved FROM the stones, so there was no
            ring until there were stones, and it grew as they were added.

            A bracelet is not built that way. The rope has a fixed length, set by
            the wrist and the bead size, and choosing stones fills the places on
            it. So there is one thing to draw, it is there before the first stone,
            and it does not change size as stones arrive. The skeleton is kept for
            the only genuinely empty wait left: before the first rope has been
            solved, when there is nothing to show.
          -->
          <div class="stage">
            @if (store.rope(); as rope) {
              <sc-strand-view
                [configuration]="rope"
                [placed]="store.placedStones()"
                [pending]="store.isStale()"
                (slotSelected)="store.selected.set($event)"
                (slotActivated)="replacing.set($event)"
                (slotRemoved)="store.removeBeadAt($event)"
                (slotMoved)="store.moveBead($event.from, $event.to)"
              />
            } @else {
              <sc-loading-skeleton height="520px" customClass="rounded-lg" />
            }

            @if (solveFailure(); as failure) {
              <div class="mt-4">
                <sc-api-error [failure]="failure" [retryable]="false" />
              </div>
            }

            <!--
              Clear, on the board, beside the thing it clears.

              Same store action as "Start over" in the review panel — not a second
              implementation, because a second way to empty the strand is a second
              place for undo to be forgotten.
            -->
            @if (store.strand().length > 0) {
              <button
                type="button"
                class="btn-secondary mt-4"
                data-testid="clear-board"
                (click)="clear()"
              >
                {{ 'STONECRAFT.DESIGNER.CLEAR' | translate }}
              </button>
            }

            <!--
              The offer, not a dialog. It appears after the work is already gone,
              which is what makes it cost nothing to the person who meant it.
            -->
            @if (store.undoable() !== null) {
              <p
                class="mt-3 flex items-center gap-3 text-sm"
                data-testid="undo-offer"
                role="status"
              >
                <span class="text-[var(--text-secondary)]">
                  @if (store.undoable(); as undoable) {
                    @if (undoable.reason === 'shortened') {
                      {{
                        'STONECRAFT.DESIGNER.SHORTENED'
                          | translate: { count: undoable.dropped ?? 0 }
                      }}
                    } @else {
                      {{ 'STONECRAFT.DESIGNER.CLEARED' | translate }}
                    }
                  }
                </span>
                <button type="button" class="btn-secondary" (click)="undoClear()">
                  {{ 'STONECRAFT.DESIGNER.UNDO' | translate }}
                </button>
              </p>
            }

            @if (replacing() !== null) {
              <p class="mt-4 text-sm text-[var(--text-secondary)]" data-testid="replacing">
                {{ 'STONECRAFT.DESIGNER.REPLACING' | translate: { position: replacing()! + 1 } }}
              </p>
            }
          </div>

          <!-- Palette, controls, review. -->
          <aside class="side space-y-8">
            @if (pendingCaution(); as stone) {
              <sc-caution-gate
                [stone]="stone"
                (acknowledged)="acceptCaution(stone)"
                (dismissed)="pendingCaution.set(null)"
              />
            }

            <sc-palette-panel
              [recommendations]="session.recommendations"
              [unavailable]="session.unavailable"
              [full]="store.isFull()"
              (stonePicked)="pick($event)"
            />

            <sc-design-controls
              [wristOptions]="store.wristOptions()"
              [diameterOptions]="store.availableDiameters()"
              [wristMm]="store.wristMm()"
              [diameterMm]="store.diameterMm()"
              [grade]="store.grade()"
              [sizingStatus]="store.sizing()?.status ?? ''"
              (wristChanged)="store.wristMm.set($event)"
              (diameterChanged)="store.diameterMm.set($event)"
              (gradeChanged)="setGrade($event)"
            />

            <!-- Review and save. -->
            <section aria-labelledby="review-heading">
              <h2 id="review-heading" class="text-eyebrow text-[var(--text-muted)]">
                {{ 'STONECRAFT.DESIGNER.REVIEW' | translate }}
              </h2>

              @if (store.rope(); as geometry) {
                <dl class="readout mt-3">
                  <!--
                    Filled of how many, not just a count. "18" says nothing about
                    whether the bracelet is nearly done; "18 of 26" is the whole
                    state of the thing in three characters.
                  -->
                  <dt>{{ 'STONECRAFT.DESIGNER.BEADS' | translate }}</dt>
                  <dd data-testid="places-filled">
                    {{
                      'STONECRAFT.DESIGNER.FILLED_OF'
                        | translate: { filled: store.strand().length, places: geometry.beadCount }
                    }}
                  </dd>
                  <dt>{{ 'STONECRAFT.DESIGNER.INNER' | translate }}</dt>
                  <dd>{{ geometry.innerCircumferenceMm | number: '1.1-1' }} mm</dd>
                  <dt>{{ 'STONECRAFT.DESIGNER.FIT' | translate }}</dt>
                  <dd>{{ fit(geometry.fitDeviationMm) }}</dd>
                </dl>

                <!--
                  Directional, because the deviation is signed and the two cases
                  need opposite instructions. One combined message told someone
                  whose bracelet was 43 mm too long to keep adding beads.
                -->
                @if (!geometry.isWithinTolerance) {
                  <p class="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    @if (geometry.fitDeviationMm > 0) {
                      {{ 'STONECRAFT.DESIGNER.TOO_LOOSE' | translate }}
                    } @else {
                      {{ 'STONECRAFT.DESIGNER.TOO_TIGHT' | translate }}
                    }
                  </p>
                }
              } @else {
                <p class="mt-3 text-sm text-[var(--text-muted)]">
                  {{ 'STONECRAFT.DESIGNER.NOTHING_TO_REVIEW' | translate }}
                </p>
              }

              <!--
                Made to order, said before someone commits. Nothing is picked from
                stock; the stones are bought and the bracelet strung after this.
              -->
              <p class="mt-4 text-xs leading-relaxed text-[var(--text-muted)]">
                {{ 'STONECRAFT.DESIGNER.MADE_TO_ORDER' | translate }}
              </p>

              @if (store.saved(); as saved) {
                <div
                  class="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-3"
                  data-testid="saved"
                >
                  <p class="text-sm text-[var(--text-primary)]">
                    {{ 'STONECRAFT.DESIGNER.SAVED' | translate }}
                  </p>
                  <p class="mt-1 font-mono text-xs break-all text-[var(--text-muted)]">
                    {{ saved.publicId }}
                  </p>
                  <button type="button" class="btn-secondary mt-3" (click)="clear()">
                    {{ 'STONECRAFT.DESIGNER.BUILD_ANOTHER' | translate }}
                  </button>
                </div>
              } @else {
                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    class="btn-primary"
                    [disabled]="!store.canSave()"
                    (click)="store.save(publicId())"
                  >
                    {{ 'STONECRAFT.DESIGNER.SAVE' | translate }}
                  </button>
                  <button type="button" class="btn-secondary" (click)="clear()">
                    {{ 'STONECRAFT.DESIGNER.RESET' | translate }}
                  </button>
                </div>
              }

              @if (saveFailure(); as failure) {
                <div class="mt-4">
                  <sc-api-error [failure]="failure" (retry)="store.save(publicId())" />
                </div>
              }

              <p class="mt-6 text-xs">
                <a routerLink="/reading/{{ publicId() }}" class="btn-editorial-link">
                  {{ 'STONECRAFT.DESIGNER.BACK_TO_READING' | translate }}
                </a>
              </p>
            </section>
          </aside>
        </div>
      }
    </main>
  `,
  styles: `
    .designer-grid {
      display: grid;
      gap: 28px;
      grid-template-columns: 1fr;
    }

    @media (min-width: 900px) {
      .designer-grid {
        grid-template-columns: minmax(0, 1fr) 360px;
        align-items: start;
      }
    }

    /*
      Mobile: the ring is pinned to the top of the viewport and the rest scrolls
      under it. Deliberate, not a reflow of the desktop grid — a person on a phone
      is looking at the bracelet while they change it.
    */
    @media (max-width: 899px) {
      .stage {
        position: sticky;
        top: 0;
        z-index: 1;
        max-height: 55vh;
        background: var(--bg-primary);
        padding-bottom: 8px;

        /*
          The stage scrolls its own overflow rather than spilling it.

          max-height caps the box, not the content: the ring, the readout and
          the per-stone tally together run well past 55vh, and with the default
          overflow visible, everything below the cap was painted outside the
          box — over the palette, with no background behind it, so the two read
          as one illegible column. Clipping it instead would silently take the
          text equivalent of the ring away on small screens, which is the one
          thing §32 asks us not to do. So the box scrolls.
        */
        overflow-y: auto;
        overscroll-behavior: contain;
      }
    }

    .readout {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 2px 14px;
      font-size: 0.875rem;
    }

    .readout dt {
      color: var(--text-muted);
    }

    .readout dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
      color: var(--text-primary);
    }

    .btn-editorial-link {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--action-green);
      text-decoration: none;
    }
  `,
})
export class DesignerPage {
  public readonly publicId = input.required<string>();

  protected readonly reading = inject(ReadingStore);
  protected readonly store = inject(BraceletDesignStore);

  private readonly bracelets = inject(BraceletsApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** The slot being replaced, if the person opened the picker on one. */
  protected readonly replacing = signal<number | null>(null);

  /** A cautioned stone waiting for its warning to be acknowledged. */
  protected readonly pendingCaution = signal<CustomerRecommendation | null>(null);

  protected readonly result = this.reading.result;

  protected readonly canRetry = computed(() => {
    const failure = this.reading.failure();
    return failure !== null && isRetryable(failure);
  });

  protected readonly solveFailure = computed(() => {
    const state = this.store.solved();
    return state.status === 'error' ? state.failure : null;
  });

  protected readonly saveFailure = computed(() => {
    const state = this.store.saving();
    return state.status === 'error' ? state.failure : null;
  });

  constructor() {
    effect(() => this.reading.loadSession(this.publicId()));

    /*
      THE STORE NEEDS THE NAMES, AND ONLY THE READING HAS THEM.

      A `StrandPosition` carries a slug, and the rope's own slots carry the probe
      material — so neither can say "Onyx". The reading can: it is where the
      person read the name in the first place, which is also why it is the right
      one to repeat back to them.

      `store.palette` existed and nothing filled it, so every label on the ring
      fell back to the slug and read "1 / 26: onyx, 8 mm" in lower case. Found by
      reading the labels off a filled rope in the browser.
    */
    effect(() => {
      const session = this.result();

      this.store.palette.set(
        session === null
          ? []
          : session.recommendations.map((recommendation) => ({
              recommendation,
              slug: recommendation.materialSlug,
              name: recommendation.canonicalNameEn,
            })),
      );
    });

    // The template and the sizing table, once. Both are small, static and shared
    // by every design, so they are fetched here rather than per solve.
    this.bracelets
      .listTemplates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (isSuccess(state) && state.value.length > 0) {
          this.store.template.set(state.value[0]);
        }
      });

    this.bracelets
      .getSizing()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        if (isSuccess(state)) {
          this.store.sizing.set(state.value);

          // Default the bead size to one both the template and the table offer.
          const offered = this.store.availableDiameters();
          if (offered.length > 0 && !offered.includes(this.store.diameterMm())) {
            this.store.diameterMm.set(offered[Math.floor(offered.length / 2)]);
          }
        }
      });

    // Start on a wrist in the middle of the range rather than at one end, so the
    // first ring a person sees is a plausible bracelet.
    effect(() => {
      const sizing = this.store.sizing();
      if (sizing === null) {
        return;
      }

      const midpoint =
        sizing.wristMinMm +
        Math.round((sizing.wristMaxMm - sizing.wristMinMm) / 2 / sizing.wristStepMm) *
          sizing.wristStepMm;

      this.store.wristMm.set(midpoint);
    });
  }

  /** How long the undo offer stands, in milliseconds. */
  private static readonly UNDO_WINDOW_MS = 8000;

  private undoTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Clears immediately and offers to put it back.
   *
   * The timer is the only thing this adds over calling `reset` directly; the
   * emptying itself is the store's single implementation.
   */
  protected clear(): void {
    this.store.reset();
    this.startUndoWindow();
  }

  /*
    The rope can drop stones without anybody pressing anything — a smaller wrist
    is enough. The offer has to start then too, or the notice appears and never
    goes away.
  */
  private readonly offerUndoWhenTrimmed = effect(() => {
    if (this.store.undoable() !== null) {
      this.startUndoWindow();
    }
  });

  protected undoClear(): void {
    this.cancelUndoWindow();
    this.store.undoReset();
  }

  private startUndoWindow(): void {
    this.cancelUndoWindow();

    this.undoTimer = setTimeout(() => {
      this.undoTimer = null;
      this.store.forgetUndo();
    }, DesignerPage.UNDO_WINDOW_MS);

    this.destroyRef.onDestroy(() => this.cancelUndoWindow());
  }

  private cancelUndoWindow(): void {
    if (this.undoTimer !== null) {
      clearTimeout(this.undoTimer);
      this.undoTimer = null;
    }
  }

  protected load(): void {
    this.reading.loadSession(this.publicId());
  }

  protected pick(stone: CustomerRecommendation): void {
    // A cautioned stone never reaches the strand without its warning in front of
    // the person first.
    if (stone.isCautioned) {
      this.pendingCaution.set(stone);
      return;
    }

    this.place(stone.representativeSlug);
  }

  protected acceptCaution(stone: CustomerRecommendation): void {
    this.pendingCaution.set(null);
    this.place(stone.representativeSlug);
  }

  /**
   * Replaces the open slot if one is open, otherwise appends.
   *
   * <b>Takes `representativeSlug`, not `materialSlug`.</b> The two differ when a
   * stone is one name of several for the same thing: `materialSlug` names the
   * row whose claims earned the recommendation, which varies with the chart,
   * while `representativeSlug` names the row that stands for the stone. A
   * bracelet is made of the latter — the card says Peridot, so the bead strung
   * is a peridot bead — and it also keeps the ring's artwork from changing
   * colour between readings of the same stone.
   */
  private place(slug: string): void {
    const replacing = this.replacing();

    if (replacing !== null) {
      this.store.replaceBeadAt(replacing, slug);
      this.replacing.set(null);
      return;
    }

    this.store.addBead(slug);
  }

  protected setGrade(grade: BeadGrade): void {
    this.store.grade.set(grade);
  }

  protected fit(deviationMm: number): string {
    return `${deviationMm >= 0 ? '+' : ''}${deviationMm.toFixed(1)} mm`;
  }
}
