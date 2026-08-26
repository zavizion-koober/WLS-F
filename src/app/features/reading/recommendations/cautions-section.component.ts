import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation, SharedRecommendation } from '@core/models/gemstones.models';

import { StoneCardComponent } from './stone-card.component';

/**
 * The stones the traditions counsel against.
 *
 * <b>Counsel, not prohibition.</b> The copy says "counselled against" and
 * "offered", never "forbidden" and "prescribed", and this section exists as its
 * own thing rather than as a fourth rank below Supportive for the same reason:
 * these are not worse recommendations, they are a different kind of statement.
 *
 * They are shown rather than hidden. A tradition that warns about a stone has
 * said something, and silently dropping it would be editing the corpus.
 */
@Component({
  selector: 'sc-cautions-section',
  standalone: true,
  imports: [TranslatePipe, StoneCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cautions().length > 0) {
      <section class="mt-14" aria-labelledby="cautions-heading">
        <h2 id="cautions-heading" class="font-display text-section-title text-[var(--brand-green)]">
          {{ 'STONECRAFT.READING.CAUTIONED_TITLE' | translate }}
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {{ 'STONECRAFT.READING.CAUTIONED_LEAD' | translate }}
        </p>

        <h3 class="sr-only">{{ 'STONECRAFT.READING.CAUTIONED_TITLE' | translate }}</h3>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          @for (stone of cautions(); track stone.materialSlug) {
            <sc-stone-card [stone]="stone" />
          }
        </div>
      </section>
    }
  `,
  styles: `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class CautionsSectionComponent {
  public readonly cautions =
    input.required<readonly (CustomerRecommendation | SharedRecommendation)[]>();
}
