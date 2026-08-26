import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';
import { ScEmptyStateComponent } from '@shared/components/sc-empty-state.component';

import { groupByTier } from '../tier-grouping';

import { StoneCardComponent } from './stone-card.component';

type AnyRecommendation = CustomerRecommendation | SharedRecommendation;

/**
 * The ranked recommendations, grouped by tier.
 *
 * The order is the backend's — `Primary`, `Secondary`, `Supportive` — and so is
 * the order inside each group, because the engine already ranked by score against
 * evidence. Re-sorting here would replace a ranking computed from the corpus with
 * one computed from whatever number the UI happened to reach for.
 *
 * `Caution` is not a fourth group. The cautioned stones are a separate list on the
 * response and get their own section, presented as counsel.
 */
@Component({
  selector: 'sc-recommendations-section',
  standalone: true,
  imports: [RouterLink, TranslatePipe, StoneCardComponent, ScEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-14" aria-labelledby="recommendations-heading">
      <h2
        id="recommendations-heading"
        class="font-display text-section-title text-[var(--brand-green)]"
      >
        {{ 'STONECRAFT.READING.RECOMMENDED_TITLE' | translate }}
      </h2>

      @if (groups().length === 0) {
        <!--
          A real state, not a placeholder. The engine can rank nothing when the
          birth data supports too few rules, and saying so beats an empty page.
        -->
        <sc-empty-state
          [title]="'STONECRAFT.READING.NO_RECOMMENDATIONS_TITLE' | translate"
          [description]="'STONECRAFT.READING.NO_RECOMMENDATIONS' | translate"
        />
      } @else {
        @for (group of groups(); track group.tier) {
          <div class="mt-8">
            <h3 class="text-eyebrow text-[var(--gold-muted)]">
              {{ 'STONECRAFT.TIER.' + group.tier.toUpperCase() | translate }}
            </h3>
            <p class="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              {{ 'STONECRAFT.TIER_NOTE.' + group.tier.toUpperCase() | translate }}
            </p>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
              @for (stone of group.items; track stone.materialSlug) {
                <sc-stone-card [stone]="stone" />
              }
            </div>
          </div>
        }

        <!--
          The door into the designer, and the only one in the app.

          Drawn only on the branch that has groups, on purpose: a reading that
          ranked nothing has no palette, and D21 says a designer with no palette
          has nothing honest to show — not an empty state, and not a fallback
          listing the whole catalogue. Offering the door anyway would send
          someone to a screen that cannot open.

          (Written without the block sigil: the template parser reads one inside
          an HTML comment as real control flow, and the file stops compiling.)

          No price, because none exists to show: the backend computes none, and a
          bracelet is quoted after the stones are sourced.
        -->
        @if (designPublicId(); as publicId) {
          <div
            class="mt-12 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 sm:p-8"
          >
            <h3 class="font-display text-card-title text-[var(--brand-green)]">
              {{ 'STONECRAFT.READING.DESIGN_TITLE' | translate }}
            </h3>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              {{ 'STONECRAFT.READING.DESIGN_DESC' | translate }}
            </p>
            <a
              class="btn-primary mt-5 inline-block"
              data-testid="design-cta"
              [routerLink]="['/designer', publicId]"
            >
              {{ 'STONECRAFT.READING.DESIGN_CTA' | translate }}
            </a>
          </div>
        }
      }
    </section>
  `,
})
export class RecommendationsSectionComponent {
  public readonly recommendations = input.required<readonly AnyRecommendation[]>();

  /**
   * The owner's reading id, when there is one.
   *
   * Null on a shared reading, which is read through a `shareToken` the designer
   * cannot use — and echoing an id that could is exactly what the shared
   * projection exists never to do.
   */
  public readonly designPublicId = input<string | null>(null);

  protected readonly groups = computed(() => groupByTier(this.recommendations()));
}
