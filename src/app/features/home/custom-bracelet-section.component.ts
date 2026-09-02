import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LastReadingService } from '@core/services/last-reading.service';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';

/**
 * The home page's introduction to the bespoke bracelet flow.
 */
@Component({
  selector: 'app-custom-bracelet-section',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-y border-[#E2DDD2] bg-[#FCFBF9] py-12 sm:py-16 lg:py-20">
      <div class="atelier-container">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          <div class="lg:col-span-7 space-y-4">
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'STONECRAFT.PROMO.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-section-title font-bold text-[#1A1A1D] tracking-tight mt-1.5">
              {{ 'STONECRAFT.PROMO.TITLE' | translate }}
            </h2>
            <p class="text-sm leading-relaxed text-[#5F5D56] max-w-xl">
              {{ 'STONECRAFT.PROMO.DESC' | translate }}
            </p>

            <div class="mt-6 sm:mt-8 flex flex-wrap items-center gap-3.5">
              <a class="btn-primary" data-testid="bracelet-cta" [routerLink]="ctaLink()">
                {{ ctaLabel() | translate }}
              </a>

              @if (resumeId(); as id) {
                <a
                  routerLink="/reading"
                  class="btn-secondary text-xs py-3 px-4"
                  [title]="'STONECRAFT.PROMO.START_NEW' | translate"
                >
                  + {{ 'STONECRAFT.PROMO.START_NEW' | translate }}
                </a>

                @if (savedBracelets.count() > 0) {
                  <a
                    routerLink="/bracelets"
                    class="text-xs uppercase tracking-wider font-semibold text-[#10523C] hover:text-[#8A7029] transition-colors ml-1"
                  >
                    {{ 'STONECRAFT.PROMO.MY_BRACELETS' | translate }} ({{ savedBracelets.count() }}) →
                  </a>
                }
              }
            </div>

            <p class="mt-4 max-w-lg text-xs leading-relaxed text-[#8D8A81]">
              {{ 'STONECRAFT.PROMO.NOTE' | translate }}
            </p>
          </div>

          <ul class="lg:col-span-5 space-y-5 sm:space-y-6">
            @for (point of points; track point.title) {
              <li class="border-l-2 border-[#CBB26A] pl-4 sm:pl-5 space-y-1">
                <h3 class="text-sm font-semibold text-[#1A1A1D]">
                  {{ point.title | translate }}
                </h3>
                <p class="text-xs sm:text-sm leading-relaxed text-[#5F5D56]">
                  {{ point.desc | translate }}
                </p>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>
  `,
})
export class CustomBraceletSectionComponent {
  private readonly lastReading = inject(LastReadingService);
  protected readonly savedBracelets = inject(SavedBraceletsService);

  /**
   * The reading this device already has, if any.
   */
  protected readonly resumeId = this.lastReading.publicId;

  protected readonly ctaLink = computed(() => {
    const id = this.resumeId();
    return id === null ? ['/reading'] : ['/reading', id];
  });

  protected readonly ctaLabel = computed(() =>
    this.resumeId() === null ? 'STONECRAFT.PROMO.CTA' : 'STONECRAFT.PROMO.CTA_RESUME',
  );

  protected readonly points = [
    { title: 'STONECRAFT.PROMO.POINT_ONE_TITLE', desc: 'STONECRAFT.PROMO.POINT_ONE_DESC' },
    { title: 'STONECRAFT.PROMO.POINT_TWO_TITLE', desc: 'STONECRAFT.PROMO.POINT_TWO_DESC' },
    { title: 'STONECRAFT.PROMO.POINT_THREE_TITLE', desc: 'STONECRAFT.PROMO.POINT_THREE_DESC' },
  ] as const;
}
