import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName, getLocalizedDescription, getLocalizedTranslation } from '@core/utils/translation.utils';
import { ProductsSelectors } from '@store/products/products.selectors';
import {
  ClearActiveProduct,
  LoadBestSellers,
  LoadProductBySlug,
} from '@store/products/products.actions';
import { AddToCart } from '@store/cart/cart.actions';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { QuantitySelectorComponent } from '@shared/components/quantity-selector/quantity-selector.component';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { BestSellerPeriod } from 'src/generated/graphql';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    PricePipe,
    AssetUrlPipe,
    IconComponent,
    LoadingSkeletonComponent,
    QuantitySelectorComponent,
    ProductCardComponent,
  ],
  template: `
    <div class="atelier-container pt-4 sm:pt-6 pb-16">
      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#8D8A81] mb-4 sm:mb-5 font-medium">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.HOME' | translate }}</a>
        <span>/</span>
        <a routerLink="/shop" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.SHOP' | translate }}</a>
        <span>/</span>
        <span class="text-[#1A1A1D] line-clamp-1 max-w-[200px] sm:max-w-none">{{ productName() }}</span>
      </nav>

      @if (loading()) {
        <!-- Skeleton Loader for PDP -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-6">
            <app-loading-skeleton height="440px" customClass="rounded-xl" />
          </div>
          <div class="lg:col-span-6 space-y-4">
            <app-loading-skeleton height="24px" width="35%" />
            <app-loading-skeleton height="38px" width="75%" />
            <app-loading-skeleton height="28px" width="25%" />
            <app-loading-skeleton height="70px" />
            <app-loading-skeleton height="46px" />
          </div>
        </div>
      } @else if (!product()) {
        <!-- Product Not Found State -->
        <div class="text-center py-16 max-w-md mx-auto space-y-4">
          <div class="w-14 h-14 rounded-full bg-[#F4F1EA] flex items-center justify-center mx-auto text-[#8A7029]">
            <app-icon name="info" [size]="24" />
          </div>
          <h1 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D]">
            {{ 'PRODUCT_DETAIL.PRODUCT_NOT_FOUND' | translate }}
          </h1>
          <p class="text-xs sm:text-sm text-[#5F5D56]">
            {{ 'PRODUCT_DETAIL.NOT_FOUND_DESC' | translate }}
          </p>
          <a routerLink="/shop" class="btn-primary text-xs py-2.5 px-5">
            {{ 'PRODUCT_DETAIL.RETURN_SHOP' | translate }}
          </a>
        </div>
      } @else {
        <!-- Main PDP Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          <!-- Left: Fixed & Sticky Gallery Stage (6 cols desktop) -->
          <div class="lg:col-span-6 lg:sticky lg:top-24 w-full">
            <!-- Main Featured Image Stage with Fixed Dimensions -->
            <div class="relative w-full h-[380px] sm:h-[440px] lg:h-[480px] bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl overflow-hidden shadow-xs flex items-center justify-center">
              <img
                [src]="activeImageUrl() | assetUrl"
                [alt]="productName()"
                (error)="handleImageError($event)"
                class="w-full h-full object-cover object-center transition-all duration-500"
              />

              @if (isOutOfStock()) {
                <div class="absolute top-3.5 left-3.5 bg-[#1A1A1D]/90 text-[#FCFBF9] text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg z-10 shadow-xs">
                  {{ 'PRODUCT.OUT_OF_STOCK' | translate }}
                </div>
              } @else if (hasSalePrice()) {
                <div class="absolute top-3.5 left-3.5 bg-[#10523C] text-[#FCFBF9] text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg z-10 shadow-xs">
                  {{ 'PRODUCT.SPECIAL' | translate }}
                </div>
              }

              <!-- Floating Bottom Thumbnails Pill Overlay -->
              @if (productImages().length > 1) {
                <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#FCFBF9]/90 backdrop-blur-md border border-[#E2DDD2] shadow-md z-10 max-w-[92%] overflow-x-auto">
                  @for (img of productImages(); track img.id) {
                    <button
                      type="button"
                      (click)="selectedImageIndex.set($index)"
                      [class.border-[#10523C]]="selectedImageIndex() === $index"
                      [class.ring-2]="selectedImageIndex() === $index"
                      [class.ring-[#10523C]/30]="selectedImageIndex() === $index"
                      class="relative w-11 h-13 sm:w-12 sm:h-14 rounded-lg overflow-hidden border border-[#E2DDD2] bg-[#FCFBF9] shrink-0 transition-all cursor-pointer hover:border-[#10523C]/60 active:scale-95"
                    >
                      <img
                        [src]="img.url | assetUrl"
                        [alt]="img.altText || productName()"
                        (error)="handleImageError($event)"
                        class="w-full h-full object-cover"
                      />
                    </button>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Right: Product Information & Actions (6 cols desktop) -->
          <div class="lg:col-span-6 space-y-3 sm:space-y-3.5">
            <!-- Category & Intention metadata -->
            <div class="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-[#8D8A81] font-medium">
              <span>{{ categoryName() }}</span>
              @if (intentionName()) {
                <span class="text-[#8A7029]">✦ {{ intentionName() }}</span>
              }
              @if (product()?.zodiac) {
                <span class="px-2 py-0.5 rounded bg-[#FCFBF9] border border-[#E2DDD2] text-[9.5px] text-[#5F5D56]">
                  {{ 'ZODIAC.' + product()?.zodiac | translate }}
                </span>
              }
            </div>

            <!-- Product Title -->
            <h1 class="font-body text-2xl sm:text-3xl font-bold text-[#1A1A1D] tracking-tight leading-snug product-detail-title">
              {{ productName() }}
            </h1>

            <!-- Price -->
            <div class="flex items-baseline gap-2.5 pb-2 border-b border-[#E2DDD2]">
              @if (hasSalePrice()) {
                <span class="text-xl sm:text-2xl font-semibold text-[#10523C] font-body">
                  {{ product()?.pricing?.salePrice?.amount | price }}
                </span>
                <span class="text-sm text-[#8D8A81] line-through">
                  {{ product()?.pricing?.price?.amount | price }}
                </span>
              } @else {
                <span class="text-xl sm:text-2xl font-semibold text-[#1A1A1D] font-body">
                  {{ product()?.pricing?.price?.amount | price }}
                </span>
              }
            </div>

            <!-- Short Description -->
            @if (shortDescription()) {
              <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed font-body line-clamp-2">
                {{ shortDescription() }}
              </p>
            }

            <!-- Stock state & Purchasing -->
            <div class="space-y-2.5 pt-0.5">
              <div class="flex items-center gap-2 text-xs">
                @if (isOutOfStock()) {
                  <span class="w-2 h-2 rounded-full bg-red-600"></span>
                  <span class="text-red-700 font-medium text-xs">{{ 'PRODUCT_DETAIL.UNAVAILABLE' | translate }}</span>
                } @else if (isLowStock()) {
                  <span class="w-2 h-2 rounded-full bg-[#8A7029]"></span>
                  <span class="text-[#8A7029] font-medium text-xs">{{ 'PRODUCT_DETAIL.LIMITED_BATCH' | translate: { count: stockQuantity() } }}</span>
                } @else {
                  <span class="w-2 h-2 rounded-full bg-[#10523C]"></span>
                  <span class="text-[#10523C] font-medium text-xs">{{ 'PRODUCT_DETAIL.IN_STOCK_CONSECRATED' | translate }}</span>
                }
              </div>

              <!-- Quantity and Add to Cart button -->
              <div class="flex items-center gap-3">
                <app-quantity-selector
                  [value]="quantity()"
                  [max]="stockQuantity() || 99"
                  (valueChange)="quantity.set($event)"
                />

                <button
                  type="button"
                  (click)="onAddToBag()"
                  [disabled]="isOutOfStock()"
                  class="btn-primary flex-1 h-[44px] text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <app-icon name="bag" [size]="16" />
                  <span>{{ 'PRODUCT_DETAIL.ADD_TO_BAG' | translate }}</span>
                </button>
              </div>
            </div>

            <div class="gold-rule"></div>

            <!-- Accordion Details (Collapsed by default for compactness) -->
            <div class="space-y-2 pt-0.5">
              <!-- Full Description -->
              @if (longDescription()) {
                <details class="group bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg p-2.5 sm:p-3 transition-all duration-200">
                  <summary class="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] cursor-pointer select-none">
                    <span>{{ 'PRODUCT_DETAIL.DESCRIPTION' | translate }}</span>
                    <span class="group-open:rotate-180 transition-transform">
                      <app-icon name="chevron-down" [size]="15" />
                    </span>
                  </summary>
                  <div class="pt-2 text-xs sm:text-sm text-[#5F5D56] leading-relaxed whitespace-pre-line border-t border-[#E2DDD2]/60 mt-2">
                    {{ longDescription() }}
                  </div>
                </details>
              }

              <!-- Materials -->
              @if (materials()) {
                <details class="group bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg p-2.5 sm:p-3 transition-all duration-200">
                  <summary class="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] cursor-pointer select-none">
                    <span>{{ 'PRODUCT_DETAIL.MATERIALS' | translate }}</span>
                    <span class="group-open:rotate-180 transition-transform">
                      <app-icon name="chevron-down" [size]="15" />
                    </span>
                  </summary>
                  <div class="pt-2 text-xs sm:text-sm text-[#5F5D56] leading-relaxed whitespace-pre-line border-t border-[#E2DDD2]/60 mt-2">
                    {{ materials() }}
                  </div>
                </details>
              }

              <!-- How to Use / Ritual Practice -->
              @if (howToUse()) {
                <details class="group bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg p-2.5 sm:p-3 transition-all duration-200">
                  <summary class="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] cursor-pointer select-none">
                    <span>{{ 'PRODUCT_DETAIL.HOW_TO_USE' | translate }}</span>
                    <span class="group-open:rotate-180 transition-transform">
                      <app-icon name="chevron-down" [size]="15" />
                    </span>
                  </summary>
                  <div class="pt-2 text-xs sm:text-sm text-[#5F5D56] leading-relaxed whitespace-pre-line border-t border-[#E2DDD2]/60 mt-2">
                    {{ howToUse() }}
                  </div>
                </details>
              }

              <!-- Shipping & Packaging Guarantee -->
              <details class="group bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg p-2.5 sm:p-3 transition-all duration-200">
                <summary class="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] cursor-pointer select-none">
                  <span>{{ 'PRODUCT_DETAIL.SHIPPING_TITLE' | translate }}</span>
                  <span class="group-open:rotate-180 transition-transform">
                    <app-icon name="chevron-down" [size]="15" />
                  </span>
                </summary>
                <div class="pt-2 text-xs sm:text-sm text-[#5F5D56] leading-relaxed border-t border-[#E2DDD2]/60 mt-2">
                  {{ 'PRODUCT_DETAIL.SHIPPING_DESC' | translate }}
                </div>
              </details>
            </div>
          </div>
        </div>

        <!-- Related / Selected Objects -->
        @if (bestSellers().length > 0) {
          <div class="mt-16 pt-8 border-t border-[#E2DDD2]">
            <div class="flex items-center justify-between mb-6">
              <div>
                <span class="text-eyebrow text-[#8A7029]">
                  {{ 'PRODUCT_DETAIL.COMPLEMENTARY_SUBTITLE' | translate }}
                </span>
                <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D] mt-1">
                  {{ 'PRODUCT_DETAIL.COMPLEMENTARY_TITLE' | translate }}
                </h2>
              </div>

              <a routerLink="/shop" class="btn-editorial-link text-xs">
                {{ 'HOME.FEATURED_CATEGORIES.VIEW_ALL' | translate }}
              </a>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              @for (item of bestSellers().slice(0, 4); track item.product.id) {
                <app-product-card [product]="item.product" />
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  public readonly localeService = inject(LocaleService);

  public readonly product = this.store.selectSignal(ProductsSelectors.activeProduct);
  public readonly loading = this.store.selectSignal(ProductsSelectors.activeProductLoading);
  public readonly bestSellers = this.store.selectSignal(ProductsSelectors.bestSellers);

  public readonly selectedImageIndex = signal(0);
  public readonly quantity = signal(1);

  private currentSlug: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (slug) {
        this.currentSlug = slug;
        this.selectedImageIndex.set(0);
        this.quantity.set(1);
        this.store.dispatch(new LoadProductBySlug(slug));
      }
    });

    this.store.dispatch(new LoadBestSellers({ period: BestSellerPeriod.AllTime, take: 4 }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(new ClearActiveProduct());
  }

  public productName(): string {
    return getLocalizedName(this.product()?.translations, this.localeService.active(), 'Ritual Object');
  }

  public shortDescription(): string {
    return getLocalizedDescription(this.product()?.translations, this.localeService.active(), '');
  }

  public longDescription(): string {
    const t = getLocalizedTranslation(this.product()?.translations, this.localeService.active());
    return t?.longDescription || t?.shortDescription || '';
  }

  public materials(): string {
    const t = getLocalizedTranslation(this.product()?.translations, this.localeService.active());
    return t?.materials || '';
  }

  public howToUse(): string {
    const t = getLocalizedTranslation(this.product()?.translations, this.localeService.active());
    return t?.howToUse || '';
  }

  public categoryName(): string {
    return getLocalizedName(this.product()?.category?.translations, this.localeService.active(), 'Atelier');
  }

  public intentionName(): string {
    return getLocalizedName(this.product()?.intention?.translations, this.localeService.active(), '');
  }

  public productImages() {
    return this.product()?.images || [];
  }

  public activeImageUrl(): string | null {
    const images = this.productImages();
    if (images.length === 0) return '/images/witchlab_hero.png';
    const index = Math.min(this.selectedImageIndex(), images.length - 1);
    return images[index]?.url || '/images/witchlab_hero.png';
  }

  public stockQuantity(): number {
    return this.product()?.inventory?.stockQuantity ?? 0;
  }

  public isOutOfStock(): boolean {
    return this.stockQuantity() <= 0;
  }

  public isLowStock(): boolean {
    const threshold = this.product()?.inventory?.lowStockThreshold ?? 5;
    return this.stockQuantity() > 0 && this.stockQuantity() <= threshold;
  }

  public hasSalePrice(): boolean {
    const sale = this.product()?.pricing?.salePrice?.amount;
    return sale !== undefined && sale !== null && Number(sale) > 0;
  }

  public handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = '/images/witchlab_hero.png';
    }
  }

  public onAddToBag(): void {
    const p = this.product();
    if (!p || this.isOutOfStock()) return;
    this.store.dispatch(new AddToCart(p.id, this.quantity(), true));
  }
}
