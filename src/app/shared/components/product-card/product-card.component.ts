import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ProductListItem } from '@store/products/products.models';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { AddToCart } from '@store/cart/cart.actions';
import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName, getLocalizedDescription } from '@core/utils/translation.utils';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, PricePipe, AssetUrlPipe, IconComponent],
  host: {
    class: 'flex flex-col h-full w-full',
    style: 'display: flex; flex-direction: column; height: 100%; width: 100%;',
  },
  template: `
    <article
      class="group relative flex flex-col h-full w-full bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl overflow-hidden transition-all duration-500 hover:border-[#CBB26A]/70 hover:shadow-[0_14px_36px_-8px_rgba(13,43,29,0.12)] hover:-translate-y-1"
      style="display: flex; flex-direction: column; height: 100%; width: 100%;"
    >
      <!-- 1. Visual Stage (4:5 Aspect Ratio) -->
      <div
        class="relative w-full aspect-[4/5] bg-[#F5F2EB] overflow-hidden shrink-0"
        style="position: relative; width: 100%; aspect-ratio: 4 / 5; flex-shrink: 0; overflow: hidden; background-color: #F5F2EB;"
      >
        <a
          [routerLink]="['/product', productSlug()]"
          class="absolute inset-0 w-full h-full block overflow-hidden cursor-pointer"
          style="position: absolute; inset: 0; width: 100%; height: 100%; display: block;"
          [attr.aria-label]="productName()"
        >
          <!-- Primary Image -->
          <img
            [src]="primaryImageUrl() | assetUrl"
            [alt]="productName()"
            loading="lazy"
            (error)="handleImageError($event)"
            class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;"
          />

          <!-- Secondary Image on Hover (if available) -->
          @if (hasSecondaryImage()) {
            <img
              [src]="secondaryImageUrl() | assetUrl"
              [alt]="productName()"
              loading="lazy"
              (error)="handleSecondaryImageError($event)"
              class="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out group-hover:scale-105"
              style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;"
            />
          }

          <!-- Subtle bottom shadow gradient on hover for button contrast -->
          <div
            class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0D2B1D]/40 via-[#0D2B1D]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          ></div>
        </a>

        <!-- Floating Badges Layer (Top) -->
        <div class="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 right-2 sm:right-2.5 z-10 flex items-start justify-between gap-1.5 pointer-events-none">
          <!-- Left Badge Group: Intention & Special Sale (Stacks cleanly on small screens) -->
          <div class="flex flex-wrap items-center gap-1 max-w-[70%]">
            @if (intentionName()) {
              <span
                class="inline-flex items-center gap-1 bg-[#FCFBF9]/95 backdrop-blur-md border border-[#E2DDD2] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider text-[#10523C] font-semibold shadow-2xs max-w-full"
                [title]="intentionName()"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-[#10523C] shrink-0 animate-pulse"></span>
                <span class="truncate max-w-[90px] sm:max-w-[130px]">{{ intentionName() }}</span>
              </span>
            }

            @if (hasSalePrice()) {
              <span
                class="inline-flex items-center bg-[#10523C] text-[#FCFBF9] text-[8.5px] sm:text-[9.5px] uppercase tracking-widest px-2 py-0.5 sm:py-1 rounded-full font-semibold shadow-2xs whitespace-nowrap shrink-0"
              >
                {{ 'PRODUCT.SPECIAL' | translate }}
              </span>
            }
          </div>

          <!-- Right Badge: Astrological Sign -->
          @if (product().zodiac) {
            <div class="shrink-0">
              <span
                class="inline-flex items-center gap-1 bg-[#FCFBF9]/95 backdrop-blur-md border border-[#E2DDD2] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9.5px] uppercase tracking-wider text-[#8A7029] font-medium shadow-2xs whitespace-nowrap"
                [title]="'ZODIAC.' + product().zodiac | translate"
              >
                <span class="text-[10px] leading-none">✦</span>
                <span class="max-w-[65px] sm:max-w-[85px] truncate">{{ 'ZODIAC.' + product().zodiac | translate }}</span>
              </span>
            </div>
          }
        </div>

        <!-- Out of Stock Overlay Badge -->
        @if (isOutOfStock()) {
          <div
            class="absolute bottom-2 sm:bottom-2.5 left-2 sm:left-2.5 z-10 inline-flex items-center bg-[#1A1A1D]/90 text-[#FCFBF9] text-[9px] sm:text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md font-medium shadow-sm pointer-events-none"
          >
            {{ 'PRODUCT.OUT_OF_STOCK' | translate }}
          </div>
        }

        <!-- Quick Add Floating Action Bar (Slide-Up on Desktop Hover) -->
        @if (!isOutOfStock()) {
          <div
            class="absolute inset-x-2.5 bottom-2.5 z-20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden sm:block"
          >
            <button
              type="button"
              (click)="onQuickAdd($event)"
              [class.bg-[#10523C]]="!justAdded()"
              [class.bg-[#092116]]="justAdded()"
              class="w-full bg-[#0D2B1D]/95 hover:bg-[#10523C] text-[#FCFBF9] hover:text-[#CBB26A] text-xs font-semibold py-2.5 px-3 rounded-lg uppercase tracking-widest transition-all duration-200 shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-[#CBB26A]/30 backdrop-blur-xs"
            >
              @if (justAdded()) {
                <app-icon name="check" [size]="14" customClass="text-[#CBB26A]" />
                <span class="text-[#CBB26A]">{{ 'CHECKOUT.CART.ADDED_TO_BAG' | translate }}</span>
              } @else {
                <app-icon name="bag" [size]="14" />
                <span>{{ 'PRODUCT.ADD_TO_BAG' | translate }}</span>
              }
            </button>
          </div>
        }
      </div>

      <!-- 2. Alchemical Editorial Body -->
      <div
        class="flex flex-col flex-1 p-4 sm:p-5 justify-between space-y-3 bg-[#FCFBF9]"
        style="display: flex; flex-direction: column; flex: 1 1 auto; justify-content: space-between;"
      >
        <div class="space-y-1.5">
          <!-- Category & Lunar Essence Eyebrow -->
          <div class="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#8A7029] font-medium font-body">
            <span>{{ categoryName() }}</span>
          </div>

          <!-- Product Name Link -->
          <h3 class="text-base sm:text-lg font-semibold text-[#1A1A1D] group-hover:text-[#10523C] transition-colors leading-snug line-clamp-1 font-body product-title">
            <a [routerLink]="['/product', productSlug()]">
              {{ productName() }}
            </a>
          </h3>

          <!-- Short Essence Description -->
          @if (shortDescription()) {
            <p class="text-xs text-[#5F5D56] line-clamp-2 leading-relaxed font-body font-light">
              {{ shortDescription() }}
            </p>
          }
        </div>

        <!-- 3. Price & Action Bar Footer -->
        <div
          class="pt-3 border-t border-[#E2DDD2]/80 flex items-center justify-between gap-2 mt-auto"
          style="margin-top: auto;"
        >
          <!-- Price Display -->
          <div class="flex items-baseline gap-2">
            @if (hasSalePrice()) {
              <span class="text-sm sm:text-base font-semibold text-[#10523C] font-body">
                {{ product().pricing?.salePrice?.amount | price }}
              </span>
              <span class="text-xs text-[#8D8A81] line-through">
                {{ product().pricing?.price?.amount | price }}
              </span>
            } @else {
              <span class="text-sm sm:text-base font-semibold text-[#1A1A1D] font-body">
                {{ product().pricing?.price?.amount | price }}
              </span>
            }
          </div>

          <!-- Actions: Mobile Quick Add & Desktop View Trigger -->
          <div class="flex items-center">
            <!-- Mobile Add to Bag Button -->
            <button
              type="button"
              (click)="onQuickAdd($event)"
              [disabled]="isOutOfStock()"
              class="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F4F1EA] text-[#10523C] hover:bg-[#10523C] hover:text-[#FCFBF9] active:scale-95 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-[#E2DDD2]"
              [title]="isOutOfStock() ? ('PRODUCT.OUT_OF_STOCK' | translate) : ('PRODUCT.ADD_TO_BAG' | translate)"
              [attr.aria-label]="'PRODUCT.ADD_TO_BAG' | translate"
            >
              @if (justAdded()) {
                <app-icon name="check" [size]="14" customClass="text-[#10523C]" />
              } @else {
                <app-icon name="bag" [size]="14" />
              }
            </button>

            <!-- Desktop Editorial View Link -->
            <a
              [routerLink]="['/product', productSlug()]"
              class="hidden sm:inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-[#8D8A81] group-hover:text-[#10523C] group-hover:translate-x-0.5 transition-all font-semibold"
            >
              <span>{{ 'PRODUCT.VIEW' | translate }}</span>
              <app-icon name="arrow-right" [size]="12" />
            </a>
          </div>
        </div>
      </div>
    </article>
  `,
})
export class ProductCardComponent {
  public readonly product = input.required<ProductListItem>();
  private readonly store = inject(Store);
  public readonly localeService = inject(LocaleService);

  public readonly imageFailed = signal(false);
  public readonly secondaryImageFailed = signal(false);
  public readonly justAdded = signal(false);

  public productSlug(): string {
    return this.product().slug?.value || this.product().id;
  }

  public productName(): string {
    return getLocalizedName(this.product().translations, this.localeService.active(), 'Ritual Object');
  }

  public shortDescription(): string {
    return getLocalizedDescription(this.product().translations, this.localeService.active(), '');
  }

  public categoryName(): string {
    return getLocalizedName(this.product().category?.translations, this.localeService.active(), 'Atelier');
  }

  public intentionName(): string {
    return getLocalizedName(this.product().intention?.translations, this.localeService.active(), '');
  }

  public primaryImageUrl(): string | null {
    if (this.imageFailed()) return '/images/witchlab_hero.png';
    const images = this.product().images;
    if (!images || images.length === 0) return null;
    const primary = images.find((img) => img.isPrimary);
    return primary ? primary.url : images[0].url;
  }

  public hasSecondaryImage(): boolean {
    if (this.secondaryImageFailed()) return false;
    const images = this.product().images;
    return !!images && images.length > 1;
  }

  public secondaryImageUrl(): string | null {
    if (this.secondaryImageFailed()) return null;
    const images = this.product().images;
    if (!images || images.length < 2) return null;
    const nonPrimary = images.find((img) => !img.isPrimary);
    return nonPrimary ? nonPrimary.url : images[1].url;
  }

  public isOutOfStock(): boolean {
    const qty = this.product().inventory?.stockQuantity;
    return qty !== undefined && qty !== null && qty <= 0;
  }

  public hasSalePrice(): boolean {
    const sale = this.product().pricing?.salePrice?.amount;
    return sale !== undefined && sale !== null && Number(sale) > 0;
  }

  public handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/images/witchlab_hero.png';
    }
    this.imageFailed.set(true);
  }

  public handleSecondaryImageError(event: Event): void {
    this.secondaryImageFailed.set(true);
  }

  public onQuickAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isOutOfStock()) return;

    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1500);

    this.store.dispatch(new AddToCart(this.product().id, 1, true));
  }
}
