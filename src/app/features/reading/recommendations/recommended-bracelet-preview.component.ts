import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import type { CustomerRecommendation } from '@core/models/gemstones.models';
import {
  calculateCustomBraceletPrice,
  generateRecommendedPreset,
  type StrandPosition,
} from '@core/models/saved-bracelet.models';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';
import { NotificationService } from '@core/services/notification.service';
import { PricePipe } from '@shared/pipes/price.pipe';
import { beadImage } from '@features/designer/strand/bead-image';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'sc-recommended-bracelet-preview',
  standalone: true,
  imports: [RouterLink, TranslatePipe, PricePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mt-12 rounded-2xl bg-gradient-to-br from-[#0D2B1D] via-[#10523C] to-[#0A1A12] text-[#FCFBF9] p-6 sm:p-10 border border-[#8A7029]/40 shadow-xl relative overflow-hidden"
    >
      <!-- Subtle atmospheric celestial glow -->
      <div class="absolute -right-10 -top-10 w-60 h-60 rounded-full bg-[#CBB26A]/10 blur-3xl pointer-events-none"></div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        <!-- Left: Composition details & CTA (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <div class="flex items-center gap-2">
            <span class="text-[#CBB26A] text-xs">✦</span>
            <span class="text-[10px] uppercase tracking-widest text-[#CBB26A] font-semibold">
              {{ 'STONECRAFT.RECOMMENDED_BRACELET.EYEBROW' | translate }}
            </span>
          </div>

          <h3 class="font-display text-2xl sm:text-3xl font-bold text-[#FCFBF9] leading-tight">
            {{ 'STONECRAFT.RECOMMENDED_BRACELET.TITLE' | translate }}
          </h3>

          <p class="text-xs sm:text-sm text-[#F4F1EA]/85 leading-relaxed max-w-xl font-light">
            {{ 'STONECRAFT.RECOMMENDED_BRACELET.DESC' | translate }}
          </p>

          <!-- Stone composition chips -->
          <div class="pt-2 flex flex-wrap gap-2">
            @for (stone of primaryStones(); track stone.slug) {
              <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FCFBF9]/10 border border-[#CBB26A]/30 text-xs">
                @if (stone.img; as src) {
                  <img [src]="src" [alt]="stone.name" class="w-4 h-4 object-contain rounded-full" />
                }
                <span class="font-medium text-[#FCFBF9]">{{ stone.name }}</span>
                <span class="text-[10px] text-[#CBB26A] font-mono">({{ stone.count }})</span>
              </div>
            }
          </div>

          <!-- Specs & Price -->
          <div class="flex items-center gap-6 pt-3 text-xs text-[#F4F1EA]/70">
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#CBB26A]">Wrist Size</span>
              <span class="font-semibold text-[#FCFBF9]">170 mm (Standard)</span>
            </div>
            <div class="h-6 w-[1px] bg-[#CBB26A]/30"></div>
            <div>
              <span class="block text-[10px] uppercase tracking-wider text-[#CBB26A]">Estimated Price</span>
              <span class="font-bold text-base text-[#CBB26A]">{{ estimatedPrice() | price }}</span>
            </div>
          </div>

          <!-- Primary Actions -->
          <div class="pt-4 flex flex-wrap items-center gap-3">
            <a
              [routerLink]="['/designer', publicId()]"
              [queryParams]="{ preset: 'recommended' }"
              class="btn-gold-accent text-xs py-3.5 px-6 uppercase tracking-wider font-semibold whitespace-nowrap shadow-md cursor-pointer flex items-center gap-2"
            >
              <span>{{ 'STONECRAFT.RECOMMENDED_BRACELET.CUSTOMIZE_CTA' | translate }}</span>
              <app-icon name="arrow-right" [size]="14" />
            </a>

            <a
              [routerLink]="['/designer', publicId()]"
              [queryParams]="{ preset: 'blank' }"
              class="text-xs uppercase tracking-wider font-medium text-[#F4F1EA]/80 hover:text-[#FCFBF9] underline py-2 px-3 transition-colors cursor-pointer"
            >
              {{ 'STONECRAFT.RECOMMENDED_BRACELET.SCRATCH_CTA' | translate }}
            </a>
          </div>
        </div>

        <!-- Right: Visual bracelet pattern ring (5 cols) -->
        <div class="lg:col-span-5 flex flex-col items-center justify-center">
          <div class="w-48 h-48 sm:w-56 sm:h-56 relative rounded-full border border-[#CBB26A]/30 flex items-center justify-center p-3 bg-[#0D2B1D]/60 shadow-inner">
            <svg class="w-full h-full" viewBox="0 0 200 200">
              <!-- Ring Guide -->
              <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(203, 178, 106, 0.25)" stroke-width="1" stroke-dasharray="3 3" />

              <!-- Render preset beads around the circle -->
              @for (bead of circleBeads(); track bead.index) {
                <g [attr.transform]="'translate(' + bead.x + ' ' + bead.y + ')'">
                  <circle cx="0" cy="0" r="7" fill="#0D2B1D" stroke="rgba(203, 178, 106, 0.4)" stroke-width="0.5" />
                  @if (bead.image; as href) {
                    <image [attr.href]="href" x="-7" y="-7" width="14" height="14" />
                  } @else {
                    <circle cx="0" cy="0" r="6" fill="#10523C" />
                  }
                </g>
              }

              <!-- Center Astrological Seal -->
              <circle cx="100" cy="100" r="28" fill="#0D2B1D" stroke="#CBB26A" stroke-width="1" />
              <text x="100" y="104" text-anchor="middle" font-family="serif" font-size="16" fill="#CBB26A">✦</text>
            </svg>
          </div>
          <span class="text-[10px] uppercase tracking-widest text-[#CBB26A]/70 mt-3 font-medium">
            Artisanal Consecration Preview
          </span>
        </div>
      </div>
    </div>
  `,
})
export class RecommendedBraceletPreviewComponent {
  public readonly recommendations = input.required<readonly CustomerRecommendation[]>();
  public readonly publicId = input.required<string>();

  private readonly savedBracelets = inject(SavedBraceletsService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly strand = computed(() => {
    return generateRecommendedPreset(this.recommendations(), 24, 8, 'Standard');
  });

  protected readonly estimatedPrice = computed(() => {
    const breakdown = calculateCustomBraceletPrice(this.strand(), 8, 'Standard', 'none');
    return breakdown.totalPrice;
  });

  protected readonly primaryStones = computed(() => {
    const list = this.strand();
    const countMap = new Map<string, number>();
    for (const pos of list) {
      countMap.set(pos.materialSlug, (countMap.get(pos.materialSlug) ?? 0) + 1);
    }

    const recs = this.recommendations();
    return [...countMap.entries()].map(([slug, count]) => {
      const rec = recs.find((r) => r.representativeSlug === slug || r.materialSlug === slug);
      return {
        slug,
        name: rec?.canonicalNameEn ?? slug,
        count,
        img: beadImage(slug),
      };
    });
  });

  protected readonly circleBeads = computed(() => {
    const list = this.strand();
    const count = list.length || 24;
    const cx = 100;
    const cy = 100;
    const radius = 75;

    return list.map((pos, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      return {
        index,
        x,
        y,
        slug: pos.materialSlug,
        image: beadImage(pos.materialSlug),
      };
    });
  });
}
