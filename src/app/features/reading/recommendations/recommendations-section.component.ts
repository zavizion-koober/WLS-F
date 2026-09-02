import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';
import { ScEmptyStateComponent } from '@shared/components/sc-empty-state.component';

import { groupByTier } from '../tier-grouping';
import { RecommendedBraceletPreviewComponent } from './recommended-bracelet-preview.component';
import { StoneCardComponent } from './stone-card.component';

type AnyRecommendation = CustomerRecommendation | SharedRecommendation;

/**
 * The ranked recommendations, grouped by tier.
 */
@Component({
  selector: 'sc-recommendations-section',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    StoneCardComponent,
    ScEmptyStateComponent,
    RecommendedBraceletPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mt-14" aria-labelledby="recommendations-heading">
      <h2
        id="recommendations-heading"
        class="font-display text-section-title text-[#10523C]"
      >
        {{ 'STONECRAFT.READING.RECOMMENDED_TITLE' | translate }}
      </h2>

      @if (groups().length === 0) {
        <sc-empty-state
          [title]="'STONECRAFT.READING.NO_RECOMMENDATIONS_TITLE' | translate"
          [description]="'STONECRAFT.READING.NO_RECOMMENDATIONS' | translate"
        />
      } @else {
        <!-- Recommended Bracelet Major Transition (Starting Composition) -->
        @if (designPublicId(); as publicId) {
          @if (isCustomerRecommendations(recommendations())) {
            <sc-recommended-bracelet-preview
              [recommendations]="asCustomerRecommendations(recommendations())"
              [publicId]="publicId"
            />
          }
        }

        @for (group of groups(); track group.tier) {
          <div class="mt-10">
            <h3 class="text-eyebrow text-[#8A7029]">
              {{ 'STONECRAFT.TIER.' + group.tier.toUpperCase() | translate }}
            </h3>
            <p class="mt-1 text-xs sm:text-sm leading-relaxed text-[#5F5D56]">
              {{ 'STONECRAFT.TIER_NOTE.' + group.tier.toUpperCase() | translate }}
            </p>

            <div class="mt-4 grid gap-4 md:grid-cols-2">
              @for (stone of group.items; track stone.materialSlug) {
                <sc-stone-card [stone]="stone" />
              }
            </div>
          </div>
        }

        <!-- Bottom Door into Designer -->
        @if (designPublicId(); as publicId) {
          <div
            class="mt-12 rounded-xl border border-[#E2DDD2] bg-[#FCFBF9] p-6 sm:p-8 shadow-xs"
          >
            <h3 class="font-display text-card-title text-[#10523C]">
              {{ 'STONECRAFT.READING.DESIGN_TITLE' | translate }}
            </h3>
            <p class="mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-[#5F5D56]">
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

  public readonly designPublicId = input<string | null>(null);

  protected readonly groups = computed(() => groupByTier(this.recommendations()));

  protected isCustomerRecommendations(recs: readonly AnyRecommendation[]): boolean {
    return recs.length > 0 && 'cautions' in recs[0];
  }

  protected asCustomerRecommendations(recs: readonly AnyRecommendation[]): readonly CustomerRecommendation[] {
    return recs as readonly CustomerRecommendation[];
  }
}
