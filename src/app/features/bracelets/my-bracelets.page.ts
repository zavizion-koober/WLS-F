import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SavedBraceletsService } from '@core/services/saved-bracelets.service';
import { NotificationService } from '@core/services/notification.service';
import { AddCustomBraceletToCart } from '@store/cart/cart.actions';
import type { SavedBracelet } from '@core/models/saved-bracelet.models';
import { PricePipe } from '@shared/pipes/price.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { beadImage } from '@features/designer/strand/bead-image';

@Component({
  selector: 'app-my-bracelets-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    PricePipe,
    DatePipe,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="atelier-container py-10 md:py-16 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.HOME' | translate }}</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'STONECRAFT.MY_BRACELETS.TITLE' | translate }}</span>
      </nav>

      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#E2DDD2] mb-10">
        <div>
          <span class="text-eyebrow text-[#8A7029]">
            {{ 'STONECRAFT.MY_BRACELETS.EYEBROW' | translate }}
          </span>
          <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1">
            {{ 'STONECRAFT.MY_BRACELETS.TITLE' | translate }}
          </h1>
          <p class="text-xs sm:text-sm text-[#5F5D56] mt-2 max-w-xl">
            {{ 'STONECRAFT.MY_BRACELETS.SUBTITLE' | translate }}
          </p>
        </div>

        <a
          routerLink="/reading"
          class="btn-primary text-xs py-3 px-5 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>+ {{ 'STONECRAFT.MY_BRACELETS.CREATE_NEW' | translate }}</span>
        </a>
      </div>

      <!-- Empty State -->
      @if (savedBracelets.bracelets().length === 0) {
        <div class="flex flex-col items-center justify-center text-center py-20 bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8">
          <div class="w-16 h-16 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#8A7029] mb-4 shadow-inner">
            <span class="text-2xl">✦</span>
          </div>
          <h2 class="font-display text-xl font-bold text-[#1A1A1D] mb-2">
            {{ 'STONECRAFT.MY_BRACELETS.EMPTY_TITLE' | translate }}
          </h2>
          <p class="text-xs sm:text-sm text-[#5F5D56] max-w-md mb-8 leading-relaxed">
            {{ 'STONECRAFT.MY_BRACELETS.EMPTY_DESC' | translate }}
          </p>
          <a routerLink="/reading" class="btn-primary text-xs py-3.5 px-6">
            {{ 'STONECRAFT.MY_BRACELETS.START_FIRST' | translate }} →
          </a>
        </div>
      } @else {
        <!-- Grid of Saved Bracelets -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          @for (bracelet of savedBracelets.bracelets(); track bracelet.id) {
            <article
              class="group relative flex flex-col justify-between rounded-2xl border border-[#E2DDD2] bg-[#FCFBF9] p-5 sm:p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#10523C]/40 hover:shadow-lg focus-within:ring-2 focus-within:ring-[#CBB26A]"
            >
              <!-- 1. Top Header: Status Badge & Secondary Utility Toolbar -->
              <div>
                <div class="flex items-center justify-between pb-3">
                  <!-- Status Badge -->
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-[#10523C]/20 bg-[#10523C]/8 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-widest text-[#10523C]">
                    <span class="h-1.5 w-1.5 rounded-full bg-[#10523C]"></span>
                    {{ 'STONECRAFT.STATUS.' + bracelet.status.toUpperCase() | translate }}
                  </span>

                  <!-- Secondary Context Actions Toolbar -->
                  <div class="flex items-center gap-1 opacity-75 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      (click)="onDuplicate(bracelet.id)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#8D8A81] transition-all hover:border-[#E2DDD2] hover:bg-[#F4F1EA] hover:text-[#10523C] active:scale-95 cursor-pointer"
                      [title]="'STONECRAFT.ACTIONS.DUPLICATE' | translate"
                      aria-label="Duplicate bracelet"
                    >
                      <app-icon name="plus" [size]="14" />
                    </button>

                    <button
                      type="button"
                      (click)="onDelete(bracelet.id)"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#8D8A81] transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-95 cursor-pointer"
                      [title]="'STONECRAFT.ACTIONS.DELETE' | translate"
                      aria-label="Delete bracelet"
                    >
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </div>
                </div>

                <!-- 2. Hero Title & Price Block -->
                <div class="border-b border-[#E2DDD2]/60 pb-3 pt-1">
                  @if (editingId() === bracelet.id) {
                    <div class="flex items-center gap-2 my-1">
                      <input
                        #nameInput
                        type="text"
                        [value]="bracelet.name"
                        class="w-full text-sm font-semibold text-[#1A1A1D] border border-[#10523C] rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#10523C]"
                        (keyup.enter)="saveRename(bracelet.id, nameInput.value)"
                      />
                      <button
                        type="button"
                        (click)="saveRename(bracelet.id, nameInput.value)"
                        class="btn-primary text-[11px] py-1 px-2.5 cursor-pointer"
                      >
                        ✓
                      </button>
                    </div>
                  } @else {
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 group/title">
                          <h2 class="font-body text-base sm:text-lg font-semibold text-[#1A1A1D] transition-colors group-hover:text-[#10523C] truncate">
                            {{ bracelet.name }}
                          </h2>
                          <button
                            type="button"
                            (click)="editingId.set(bracelet.id)"
                            class="opacity-0 group-hover/title:opacity-100 text-[#8D8A81] hover:text-[#10523C] text-xs transition-opacity cursor-pointer p-0.5"
                            [title]="'STONECRAFT.ACTIONS.RENAME' | translate"
                            aria-label="Rename bracelet"
                          >
                            ✎
                          </button>
                        </div>
                        <p class="mt-0.5 text-[11px] text-[#8D8A81]">
                          განახლდა: {{ bracelet.updatedAt | date: 'mediumDate' }}
                        </p>
                      </div>

                      <div class="text-right shrink-0">
                        <span class="font-body text-lg sm:text-xl font-bold text-[#10523C] tabular-nums block">
                          {{ bracelet.price | price }}
                        </span>
                        <span class="text-[9.5px] uppercase tracking-wider text-[#8A7029] font-medium">
                          {{ bracelet.grade }}
                        </span>
                      </div>
                    </div>
                  }
                </div>

                <!-- 3. Physical Product Presentation Stage (SVG Render with Depth & Seal) -->
                <div class="relative my-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-[#E2DDD2]/70 bg-gradient-to-b from-[#F4F1EA]/80 via-[#F4F1EA]/50 to-[#F4F1EA]/20 p-3 shadow-inner">
                  <svg class="h-full w-full max-h-36 drop-shadow-[0_8px_14px_rgba(13,43,29,0.14)]" viewBox="0 0 160 160">
                    <defs>
                      <!-- Bead Contact Shadow Filter -->
                      <filter id="beadShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" flood-color="#0D2B1D" flood-opacity="0.22" />
                      </filter>
                    </defs>

                    <!-- Subtle Base Ground Ellipse -->
                    <ellipse cx="80" cy="88" rx="60" ry="46" fill="rgba(13, 43, 29, 0.04)" filter="blur(4px)" />

                    <!-- Internal Continuous Elastic Jewelry Cord -->
                    <circle cx="80" cy="80" r="54" fill="none" stroke="#CBB26A" stroke-width="1.2" stroke-opacity="0.45" />

                    <!-- Render Connected Gemstone Beads -->
                    @for (bead of circlePreview(bracelet); track bead.index) {
                      <g [attr.transform]="'translate(' + bead.x + ' ' + bead.y + ')'" filter="url(#beadShadow)">
                        <circle cx="0" cy="0" r="5.5" fill="#0D2B1D" stroke="rgba(203, 178, 106, 0.5)" stroke-width="0.75" />
                        @if (bead.image; as href) {
                          <image [attr.href]="href" x="-5.5" y="-5.5" width="11" height="11" class="rounded-full" />
                        } @else {
                          <circle cx="0" cy="0" r="5" fill="#10523C" />
                        }
                      </g>
                    }

                    <!-- Center Atelier Consecration Seal -->
                    <g transform="translate(80, 80)">
                      <circle cx="0" cy="0" r="21" fill="#FCFBF9" stroke="#E2DDD2" stroke-width="1" />
                      <circle cx="0" cy="0" r="18" fill="none" stroke="#CBB26A" stroke-width="0.5" stroke-dasharray="2.5 1.5" />
                      <text y="-2" text-anchor="middle" font-family="serif" font-size="9" fill="#8A7029">✦</text>
                      <text y="9" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="600" fill="#5F5D56" letter-spacing="0.5">
                        {{ bracelet.wristMm }} მმ
                      </text>
                    </g>
                  </svg>
                </div>

                <!-- 4. Material Chromatic Tag Swatches -->
                <div class="space-y-1.5 pb-3">
                  <span class="text-[10px] font-semibold uppercase tracking-wider text-[#8D8A81] block">
                    {{ 'STONECRAFT.DESIGNER.SELECTED_STONES' | translate }}:
                  </span>
                  <div class="flex flex-wrap gap-1.5">
                    @for (s of bracelet.stones; track s.slug) {
                      <span class="inline-flex items-center gap-1.5 rounded-md border border-[#E2DDD2] bg-[#FCFBF9] px-2 py-0.5 text-[11px] font-medium text-[#1A1A1D] shadow-2xs">
                        <!-- Gemstone Chromatic Dot Swatch -->
                        <span
                          class="h-2 w-2 rounded-full ring-1 ring-black/10 shrink-0"
                          [style.background-color]="getStoneColor(s.slug)"
                        ></span>
                        <span class="truncate max-w-[120px]">{{ s.name }}</span>
                        <span class="font-bold text-[#10523C] text-[10px]">×{{ s.count }}</span>
                      </span>
                    }
                  </div>
                </div>

                <!-- 5. Technical Specifications Grid -->
                <div class="grid grid-cols-2 gap-2 border-t border-[#E2DDD2]/60 py-3 text-[11px] text-[#5F5D56]">
                  <div>
                    <span class="block text-[10px] text-[#8D8A81] uppercase tracking-wider">
                      {{ 'STONECRAFT.DESIGNER.WRIST' | translate }}
                    </span>
                    <span class="font-semibold text-[#1A1A1D]">{{ bracelet.wristMm }} მმ</span>
                  </div>
                  <div>
                    <span class="block text-[10px] text-[#8D8A81] uppercase tracking-wider">
                      {{ 'STONECRAFT.DESIGNER.DIAMETER' | translate }}
                    </span>
                    <span class="font-semibold text-[#1A1A1D]">
                      {{ bracelet.diameterMm }} მმ • {{ bracelet.strand.length }} ცალი
                    </span>
                  </div>
                </div>
              </div>

              <!-- 6. Action Footer: Clear Hierarchy (Primary & Secondary CTAs) -->
              <div class="space-y-2 pt-3 border-t border-[#E2DDD2] mt-2">
                <!-- Primary CTA: Edit Configuration in Designer -->
                <a
                  [routerLink]="['/designer', bracelet.readingPublicId]"
                  [queryParams]="{ braceletId: bracelet.id }"
                  class="btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm transition-transform active:scale-[0.98] cursor-pointer"
                >
                  <app-icon name="sparkles" [size]="14" />
                  <span>{{ 'STONECRAFT.ACTIONS.CONTINUE_DESIGNING' | translate }}</span>
                </a>

                <!-- Secondary CTA: Direct Add to Bag -->
                <button
                  type="button"
                  (click)="onAddToCart(bracelet)"
                  class="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#E2DDD2] bg-[#F4F1EA]/60 text-xs font-semibold text-[#10523C] transition-all hover:bg-[#F4F1EA] hover:border-[#10523C]/40 active:scale-[0.98] cursor-pointer"
                >
                  <app-icon name="bag" [size]="14" />
                  <span>{{ 'CHECKOUT.CART.ADD_TO_BAG' | translate }} • {{ bracelet.price | price }}</span>
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class MyBraceletsPageComponent {
  protected readonly savedBracelets = inject(SavedBraceletsService);
  private readonly store = inject(Store);
  private readonly notification = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  public readonly editingId = signal<string | null>(null);

  public onDuplicate(id: string): void {
    const copy = this.savedBracelets.duplicate(id);
    if (copy) {
      this.notification.success(
        this.translate.instant('STONECRAFT.MESSAGES.DUPLICATED', { defaultValue: 'Bracelet design duplicated' }),
      );
    }
  }

  public onDelete(id: string): void {
    if (confirm(this.translate.instant('STONECRAFT.MESSAGES.DELETE_CONFIRM', { defaultValue: 'Delete this saved design?' }))) {
      this.savedBracelets.delete(id);
      this.notification.success(
        this.translate.instant('STONECRAFT.MESSAGES.DELETED', { defaultValue: 'Bracelet design deleted' }),
      );
    }
  }

  public saveRename(id: string, newName: string): void {
    if (this.savedBracelets.rename(id, newName)) {
      this.editingId.set(null);
    }
  }

  public onAddToCart(bracelet: SavedBracelet): void {
    this.store.dispatch(new AddCustomBraceletToCart(bracelet, true));
  }

  public getStoneColor(slug: string): string {
    const s = slug.toLowerCase();
    if (s.includes('zircon') || s.includes('champagne')) return '#B38F4D';
    if (s.includes('garnet') || s.includes('ruby') || s.includes('carnelian')) return '#781D22';
    if (s.includes('bloodstone') || s.includes('jade') || s.includes('aventurine') || s.includes('emerald') || s.includes('malachite')) return '#1F382B';
    if (s.includes('flint') || s.includes('hematite') || s.includes('smoky') || s.includes('pyrite')) return '#6B6358';
    if (s.includes('lapis') || s.includes('sapphire') || s.includes('sodalite') || s.includes('aquamarine')) return '#1B3573';
    if (s.includes('amethyst') || s.includes('fluorite')) return '#5C3A6E';
    if (s.includes('tiger') || s.includes('amber') || s.includes('citrine')) return '#8F5724';
    if (s.includes('rose') || s.includes('rhodonite')) return '#D99FA8';
    if (s.includes('onyx') || s.includes('obsidian') || s.includes('tourmaline')) return '#141416';
    return '#10523C';
  }

  public circlePreview(bracelet: SavedBracelet) {
    const list = bracelet.strand;
    const count = list.length || 1;
    const cx = 80;
    const cy = 80;
    const radius = 54;

    return list.map((pos, index) => {
      const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
      return {
        index,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        image: beadImage(pos.materialSlug),
      };
    });
  }
}
