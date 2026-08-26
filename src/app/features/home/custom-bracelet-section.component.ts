import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LastReadingService } from '@core/services/last-reading.service';

/**
 * The home page's introduction to the bracelet flow, and the app's only
 * entrance to it.
 *
 * Styled as a full-bleed band rather than a product grid, and that is the point:
 * this is not a thing on a shelf. Nothing is picked from stock — the stones are
 * sourced and the bracelet strung after someone orders — so it should not look
 * like the rows of candles above it.
 *
 * <b>No price, and not because one is missing.</b> The recommendation backend
 * computes none by design; it handles no money and a test fails its build if a
 * price appears in its schema. A number here would be invented, and an invented
 * number on a home page is a promise.
 */
@Component({
  selector: 'app-custom-bracelet-section',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-y border-[#E2DDD2] bg-[#FCFBF9] py-16 sm:py-24">
      <div class="atelier-container">
        <div class="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div class="max-w-2xl">
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'STONECRAFT.PROMO.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-section-title mt-2 mb-3 font-bold text-[#1A1A1D]">
              {{ 'STONECRAFT.PROMO.TITLE' | translate }}
            </h2>
            <p class="text-sm leading-relaxed text-[#5F5D56]">
              {{ 'STONECRAFT.PROMO.DESC' | translate }}
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-4">
              <a class="btn-primary" data-testid="bracelet-cta" [routerLink]="ctaLink()">
                {{ ctaLabel() | translate }}
              </a>

              @if (resumeId(); as id) {
                <span class="text-xs text-[#8D8A81]">
                  {{ 'STONECRAFT.PROMO.RESUME_NOTE' | translate }}
                </span>
              }
            </div>

            <p class="mt-6 max-w-lg text-xs leading-relaxed text-[#8D8A81]">
              {{ 'STONECRAFT.PROMO.NOTE' | translate }}
            </p>
          </div>

          <ul class="space-y-6">
            @for (point of points; track point.title) {
              <li class="border-l-2 border-[#CBB26A] pl-5">
                <h3 class="text-sm font-semibold text-[#1A1A1D]">
                  {{ point.title | translate }}
                </h3>
                <p class="mt-1 text-sm leading-relaxed text-[#5F5D56]">
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

  /**
   * The reading this device already has, if any.
   *
   * A reading is anonymous, tied to an HttpOnly cookie, and there is no screen
   * that lists it. Without this the section invites someone who read their chart
   * yesterday to start again from an empty form — and the bracelet they designed
   * becomes permanently unreachable.
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
