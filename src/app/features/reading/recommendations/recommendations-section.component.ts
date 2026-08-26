import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
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
  imports: [TranslatePipe, StoneCardComponent, ScEmptyStateComponent],
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
      }
    </section>
  `,
})
export class RecommendationsSectionComponent {
  public readonly recommendations = input.required<readonly AnyRecommendation[]>();

  protected readonly groups = computed(() => groupByTier(this.recommendations()));
}
