import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type {
  CustomerRecommendation,
  CustomerUnavailableGroup,
} from '@core/models/gemstones.models';
import { groupByTier, shownToAPerson } from '@features/reading/tier-grouping';

import { beadImage } from '../strand/bead-image';

/**
 * The stones this person's chart named. There is no explore section (D21).
 *
 * <b>The palette is `recommendations[]` and nothing else.</b> A designer without
 * a chart has no palette, which is why `/designer` redirects rather than showing
 * an empty state. Stones appearing only in `cautions[]` are out — the corpus
 * warns and does not recommend, and that is not "belongs to you".
 *
 * <b>Tier is a per-stone marker, not the panel's organising structure.</b> Since
 * D22 the tiers are not balanced: Primary holds most of a palette and on one
 * reference chart it holds 19 of 20. A panel built around three even sections
 * would look broken on exactly the charts that are working correctly, so the
 * stones flow in one grid and each carries its tier as a small label.
 * `groupByTier` still decides the order — it drops empty groups and keeps the
 * backend's sequence — it just does not draw the boxes.
 *
 * <b>Everything is shown; the five-and-expand belongs to the reading page.</b>
 * The headline needs brevity because it is a claim being made to someone. A
 * palette is a set of materials being offered, and twenty is a good number to
 * choose from rather than an overwhelming one.
 */
@Component({
  selector: 'sc-palette-panel',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="palette-heading">
      <h2 id="palette-heading" class="text-eyebrow text-[var(--text-muted)]">
        {{ 'STONECRAFT.DESIGNER.PALETTE' | translate }}
      </h2>

      <!--
        The size, stated plainly. "Your chart names six stones" is a fact about
        the chart, not an apology for a short list.
      -->
      <p class="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        {{ 'STONECRAFT.DESIGNER.PALETTE_SIZE' | translate: { count: stones().length } }}
      </p>

      @if (stones().length === 0) {
        <p
          class="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
          data-testid="palette-empty"
        >
          {{ 'STONECRAFT.DESIGNER.PALETTE_EMPTY' | translate }}
        </p>
      } @else {
        <!--
          The rope is full, so every stone here is unpressable until something
          changes. Said once, above them, rather than as twenty-six identical
          tooltips — and it names the two things that make room, because "full"
          without a way out is just a dead end.
        -->
        @if (full() && replacing() === null) {
          <p
            class="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3 text-sm leading-relaxed text-[var(--text-secondary)]"
            data-testid="palette-full"
            role="status"
          >
            {{ 'STONECRAFT.DESIGNER.ROPE_FULL' | translate }}
          </p>
        }

        <ul class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="list">
          @for (stone of stones(); track stone.materialSlug) {
            <li>
              <button
                type="button"
                class="stone w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-center"
                [attr.data-slug]="stone.materialSlug"
                [attr.aria-label]="label(stone)"
                [disabled]="full() && replacing() === null"
                (click)="stonePicked.emit(stone)"
              >
                @if (image(stone.representativeSlug); as href) {
                  <img [src]="href" alt="" class="mx-auto block aspect-square w-full" />
                } @else {
                  <!--
                    Most of a palette draws like this today: 8 renders exist and 93
                    materials are reachable. An outline says "nobody has drawn this
                    yet"; a generic grey sphere would claim to be its picture.
                  -->
                  <span
                    class="mx-auto block aspect-square w-full rounded-full border border-dashed border-[var(--border-dark)]"
                  ></span>
                }

                <span class="mt-1.5 block text-[11px] leading-tight text-[var(--text-primary)]">
                  {{ stone.canonicalNameEn }}
                </span>

                <span class="mt-0.5 flex items-center justify-center gap-1">
                  <span class="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                    {{ 'STONECRAFT.TIER.' + stone.tier.toUpperCase() | translate }}
                  </span>

                  @if (stone.isCautioned) {
                    <span
                      class="rounded-[3px] border border-[var(--gold)] px-1 text-[10px] text-[var(--gold-muted)]"
                      >{{ 'STONECRAFT.DESIGNER.CAUTION_MARK' | translate }}</span
                    >
                  }
                </span>
              </button>
            </li>
          }
        </ul>
      }

      <!--
        Not a palette — an explanation. A stone the engine could not assess is
        worth showing greyed with its reason, because BirthTimeUnknown in
        particular is something the person could unlock, and the data already
        says so.
      -->
      @if (shown().length > 0) {
        <div class="mt-6" data-testid="palette-unavailable">
          <h3 class="text-eyebrow text-[var(--text-muted)]">
            {{ 'STONECRAFT.DESIGNER.UNAVAILABLE_TITLE' | translate }}
          </h3>
          <ul class="mt-2 space-y-1">
            @for (group of shown(); track group.reason) {
              <li class="text-sm leading-relaxed text-[var(--text-muted)]">
                {{
                  'STONECRAFT.UNAVAILABLE.' + group.reason.toUpperCase()
                    | translate: { count: group.count }
                }}
              </li>
            }
          </ul>
        </div>
      }
    </section>
  `,
  styles: `
    .stone {
      cursor: pointer;
      transition:
        border-color 0.15s ease,
        transform 0.15s ease;
    }

    .stone:hover {
      border-color: var(--border-dark);
      transform: translateY(-1px);
    }

    /*
      Outline rather than box-shadow: forced-colors mode suppresses box-shadow
      and preserves outline. This one degraded least badly of the three, by
      accident, because border-color survives — which is exactly the kind of
      accident not to rely on. See strand-view.component.ts.
    */
    .stone:focus-visible {
      outline: 1px solid var(--action-green);
      outline-offset: 1px;
      border-color: var(--action-green);
    }

    @media (prefers-reduced-motion: reduce) {
      .stone {
        transition: none;
      }

      .stone:hover {
        transform: none;
      }
    }
  `,
})
export class PalettePanelComponent {
  public readonly recommendations = input.required<readonly CustomerRecommendation[]>();
  public readonly unavailable = input.required<readonly CustomerUnavailableGroup[]>();

  /**
   * Whether the rope has any places left.
   *
   * <b>Said here, because here is where a person tries.</b> The store already
   * refuses to overfill; a refusal with no explanation is indistinguishable from
   * a broken button, and the palette is what somebody is looking at when they
   * press it.
   */
  public readonly full = input<boolean>(false);
  public readonly replacing = input<number | null>(null);

  /**
   * The groups worth putting in front of a person.
   *
   * `MaterialWithdrawn` is dropped — see `shownToAPerson`. It arrives on every
   * reading, says the same thing every time, and is about the shop's catalogue
   * rather than about this chart.
   */
  protected readonly shown = computed(() => shownToAPerson(this.unavailable()));

  public readonly stonePicked = output<CustomerRecommendation>();

  /**
   * Every recommended stone, in the backend's tier order.
   *
   * Flattened deliberately — see the class remarks. `groupByTier` still decides
   * the sequence and still drops empty groups; it just does not draw sections.
   */
  protected readonly stones = computed(() =>
    groupByTier(this.recommendations()).flatMap((group) => group.items),
  );

  /**
   * Keyed on `representativeSlug`, never on `materialSlug`.
   *
   * `materialSlug` names the row whose claims earned the recommendation and it
   * varies with the chart, because a synonym group is folded into one card and
   * the survivor is chosen by score. A stone called Peridot would otherwise be
   * drawn in whichever of three greens won that day — the same defect the group
   * display name fixed one layer up, and made *more* confusing by fixing, since
   * the label no longer moves to explain the picture.
   */
  protected image(slug: string): string | null {
    return beadImage(slug);
  }

  protected label(stone: CustomerRecommendation): string {
    return stone.isCautioned
      ? `${stone.canonicalNameEn}, ${stone.tier}, cautioned`
      : `${stone.canonicalNameEn}, ${stone.tier}`;
  }
}
