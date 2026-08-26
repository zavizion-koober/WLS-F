import { Component, computed, effect, inject, OnDestroy, OnInit, PLATFORM_ID, signal, untracked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName, getLocalizedDescription } from '@core/utils/translation.utils';
import { ProductsSelectors } from '@store/products/products.selectors';
import { LoadBestSellers } from '@store/products/products.actions';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { LoadCategories } from '@store/categories/categories.actions';
import { IntentionsSelectors } from '@store/intentions/intentions.selectors';
import { LoadIntentions, LoadIntentionProducts } from '@store/intentions/intentions.actions';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { PricePipe } from '@shared/pipes/price.pipe';
import { BestSellerPeriod } from 'src/generated/graphql';
import { ProductListItem } from '@store/products/products.models';
import { CategoryItem } from '@store/categories/categories.models';
import { IntentionItem } from '@store/intentions/intentions.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    ProductCardComponent,
    LoadingSkeletonComponent,
    IconComponent,
    AssetUrlPipe,
    PricePipe,
  ],
  template: `
    <div class="space-y-20 sm:space-y-28 lg:space-y-36 pb-24">
      <!-- 1. EDITORIAL HERO SECTION -->
      <section class="atelier-container pt-8 sm:pt-14 lg:pt-20">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          <!-- Left Column: Editorial Typography & Manifesto (40% desktop) -->
          <div class="lg:col-span-5 flex flex-col items-start space-y-6 sm:space-y-8">
            <div class="space-y-3">
              <span class="text-eyebrow text-[#8A7029]">
                {{ 'HOME.HERO.SUBTITLE' | translate }}
              </span>

              <h1 class="font-display text-hero font-bold text-[#1A1A1D] tracking-tight leading-[1.08]">
                {{ 'HOME.HERO.TITLE' | translate }}
              </h1>
            </div>

            <p class="text-sm sm:text-base text-[#5F5D56] leading-relaxed max-w-lg font-body font-light">
              {{ 'HOME.HERO.DESC' | translate }}
            </p>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2 w-full sm:w-auto">
              <a routerLink="/shop" class="btn-primary">
                {{ 'HOME.HERO.SHOP_CTA' | translate }} →
              </a>

              <a
                routerLink="/about"
                class="btn-editorial-link px-2 py-3 text-center sm:text-left justify-center sm:justify-start"
              >
                {{ 'NAVBAR.OUR_STORY' | translate }}
              </a>
            </div>

            <!-- Materiality callout -->
            <div class="pt-4 border-t border-[#E2DDD2] w-full flex items-center justify-between text-[11px] uppercase tracking-widest text-[#8D8A81]">
              <span>{{ 'HOME.HERO.PILLARS.HAND_POURED' | translate }}</span>
              <span>•</span>
              <span>{{ 'HOME.HERO.PILLARS.BOTANICAL_ESSENCES' | translate }}</span>
              <span>•</span>
              <span>{{ 'HOME.HERO.PILLARS.LUNAR_CYCLES' | translate }}</span>
            </div>
          </div>

          <!-- Right Column: Clean Product Card Carousel (60% desktop) -->
          <div class="lg:col-span-7">
            <div
              class="relative w-full flex flex-col items-center select-none py-2"
              (mouseenter)="pauseSlider()"
              (mouseleave)="resumeSlider()"
              (touchstart)="onTouchStart($event)"
              (touchend)="onTouchEnd($event)"
            >
              <!-- Carousel Stage -->
              <div class="relative w-full h-[370px] xs:h-[410px] sm:h-[450px] lg:h-[480px] flex items-center justify-center overflow-hidden">
                @if (heroProducts().length === 0) {
                  <!-- Fallback Card -->
                  <div class="w-[240px] xs:w-[270px] sm:w-[300px] lg:w-[330px] aspect-[4/5] rounded-xl overflow-hidden shadow-lg bg-[#F5F2EB] border border-[#E2DDD2]/70 relative">
                    <img
                      src="/images/witchlab_hero.png"
                      alt="WitchLab Ritual Objects"
                      class="w-full h-full object-cover object-center"
                    />
                    <div class="absolute inset-x-0 bottom-0 pt-16 pb-4 px-4 sm:px-5 flex flex-col justify-end bg-gradient-to-t from-[#0A1A12]/92 via-[#0A1A12]/60 to-transparent text-[#FCFBF9]">
                      <span class="text-[9.5px] sm:text-[10px] uppercase tracking-[0.2em] text-[#CBB26A] font-medium font-body mb-1">
                        Atelier Collection
                      </span>
                      <h3 class="font-body text-base sm:text-lg font-semibold text-[#FCFBF9] leading-snug product-title">
                        WitchLab Ritual Objects
                      </h3>
                    </div>
                  </div>
                } @else {
                  <!-- 3-Card Carousel Track -->
                  <div class="relative w-full h-full flex items-center justify-center">
                    @for (prod of heroProducts(); track prod.id; let idx = $index) {
                      <article
                        (click)="onSlideCardClick(idx)"
                        class="absolute w-[240px] xs:w-[270px] sm:w-[300px] lg:w-[330px] aspect-[4/5] rounded-xl overflow-hidden bg-[#F5F2EB] border border-[#E2DDD2]/70 cursor-pointer select-none transition-all"
                        [ngClass]="getSlideClasses(idx)"
                        [style.transform]="getSlideTransform(idx)"
                        [style.filter]="getSlideFilter(idx)"
                        style="transition: transform 800ms cubic-bezier(0.22, 1, 0.36, 1), opacity 800ms cubic-bezier(0.22, 1, 0.36, 1), filter 800ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 800ms cubic-bezier(0.22, 1, 0.36, 1);"
                      >
                        <!-- Product Image -->
                        <img
                          [src]="getProductImage(prod) | assetUrl"
                          [alt]="getProductName(prod)"
                          [loading]="idx === currentSlideIndex() ? 'eager' : 'lazy'"
                          class="w-full h-full object-cover object-center"
                        />

                        <!-- Bottom Information Overlay -->
                        <div
                          class="absolute inset-x-0 bottom-0 pt-16 pb-4 px-4 sm:px-5 flex flex-col justify-end bg-gradient-to-t from-[#0A1A12]/92 via-[#0A1A12]/60 to-transparent text-[#FCFBF9]"
                        >
                          <!-- Category & Zodiac -->
                          <div class="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] uppercase tracking-[0.2em] text-[#CBB26A] font-medium font-body mb-1">
                            <span class="truncate">{{ getCategoryName(prod) }}</span>
                            @if (prod.zodiac) {
                              <span>•</span>
                              <span class="text-[#E2DDD2]/80 truncate">✦ {{ 'ZODIAC.' + prod.zodiac | translate }}</span>
                            }
                          </div>

                          <!-- Product Name -->
                          <h3 class="font-body text-base sm:text-lg font-semibold text-[#FCFBF9] leading-snug line-clamp-1 mb-2.5 product-title">
                            {{ getProductName(prod) }}
                          </h3>

                          <!-- Price & View Product Button -->
                          <div class="flex items-center justify-between gap-2 pt-2 border-t border-[#FCFBF9]/15">
                            <span class="font-body text-sm sm:text-base font-semibold text-[#FCFBF9]">
                              {{ prod.pricing?.price?.amount | price }}
                            </span>

                            <span
                              class="inline-flex items-center gap-1 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[#0A1A12] bg-[#FCFBF9] hover:bg-[#CBB26A] px-2.5 sm:px-3 py-1 rounded-md transition-colors shadow-2xs"
                            >
                              <span>{{ 'PRODUCT.VIEW' | translate }}</span>
                              <app-icon name="arrow-right" [size]="10" />
                            </span>
                          </div>
                        </div>
                      </article>
                    }
                  </div>

                  <!-- Minimal Navigation Controls -->
                  @if (heroProducts().length > 1) {
                    <button
                      type="button"
                      (click)="prevSlide($event)"
                      aria-label="Previous product"
                      class="absolute left-1 sm:left-2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCFBF9]/90 hover:bg-[#0A1A12] text-[#1A1A1D] hover:text-[#FCFBF9] border border-[#E2DDD2] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <app-icon name="chevron-left" [size]="14" />
                    </button>

                    <button
                      type="button"
                      (click)="nextSlide($event)"
                      aria-label="Next product"
                      class="absolute right-1 sm:right-2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FCFBF9]/90 hover:bg-[#0A1A12] text-[#1A1A1D] hover:text-[#FCFBF9] border border-[#E2DDD2] flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <app-icon name="chevron-right" [size]="14" />
                    </button>
                  }
                }
              </div>

              <!-- Dynamic Indicator Lines (Active Expands / Others Shrink) -->
              @if (heroProducts().length > 1) {
                <div class="flex items-center justify-center gap-1.5 sm:gap-2 mt-5" role="tablist" aria-label="Product slides">
                  @for (prod of heroProducts(); track prod.id; let idx = $index) {
                    <button
                      type="button"
                      (click)="goToSlide(idx, $event)"
                      role="tab"
                      [attr.aria-selected]="isCurrentSlide(idx)"
                      [class.w-7]="isCurrentSlide(idx)"
                      [class.sm:w-9]="isCurrentSlide(idx)"
                      [class.bg-[#10523C]]="isCurrentSlide(idx)"
                      [class.opacity-100]="isCurrentSlide(idx)"
                      [class.w-2]="!isCurrentSlide(idx)"
                      [class.sm:w-2.5]="!isCurrentSlide(idx)"
                      [class.bg-[#D8D2C4]]="!isCurrentSlide(idx)"
                      [class.opacity-70]="!isCurrentSlide(idx)"
                      class="h-[2.5px] rounded-full transition-all duration-500 ease-out cursor-pointer hover:opacity-100 hover:bg-[#8A7029]"
                      [attr.aria-label]="'Go to product ' + (idx + 1) + ' of ' + heroProducts().length"
                    ></button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- 2. DISCOVERY: PATH 1 - SHOP BY CATEGORY -->
      <section class="atelier-container">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-[#E2DDD2] gap-4">
          <div>
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'HOME.FEATURED_CATEGORIES.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-section-title font-bold text-[#1A1A1D] mt-1">
              {{ 'HOME.FEATURED_CATEGORIES.TITLE' | translate }}
            </h2>
          </div>

          <a routerLink="/shop" class="btn-editorial-link">
            {{ 'HOME.FEATURED_CATEGORIES.VIEW_ALL' | translate }}
          </a>
        </div>

        @if (categoriesLoading() && categories().length === 0) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            @for (i of [1, 2, 3, 4]; track i) {
              <app-loading-skeleton height="240px" customClass="rounded-lg" />
            }
          </div>
        } @else if (categories().length > 0) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            @for (cat of categories(); track cat.id) {
              <a
                [routerLink]="['/shop']"
                [queryParams]="{ categoryId: cat.id }"
                class="group relative flex flex-col bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg overflow-hidden transition-all duration-300 hover:border-[#8A7029] hover:shadow-md cursor-pointer"
              >
                <div class="w-full aspect-[4/3] bg-[#F4F1EA] overflow-hidden">
                  <img
                    [src]="cat.imageUrl | assetUrl"
                    [alt]="getCategoryItemName(cat)"
                    class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </div>
                <div class="p-4 sm:p-5 flex items-center justify-between">
                  <div>
                    <h3 class="font-body text-base sm:text-lg font-semibold text-[#1A1A1D] group-hover:text-[#10523C] transition-colors category-title">
                      {{ getCategoryItemName(cat) }}
                    </h3>
                    @if (getCategoryItemDesc(cat)) {
                      <p class="text-xs text-[#5F5D56] line-clamp-1 mt-0.5 font-body">
                        {{ getCategoryItemDesc(cat) }}
                      </p>
                    }
                  </div>
                  <span class="text-[#8D8A81] group-hover:text-[#10523C] group-hover:translate-x-1 transition-all">
                    <app-icon name="arrow-right" [size]="16" />
                  </span>
                </div>
              </a>
            }
          </div>
        }
      </section>

      <!-- 3. SELECTED OBJECTS (BEST SELLERS) -->
      <section class="atelier-container">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-[#E2DDD2] gap-4">
          <div>
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'HOME.BEST_SELLERS.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-section-title font-bold text-[#1A1A1D] mt-1">
              {{ 'HOME.BEST_SELLERS.TITLE' | translate }}
            </h2>
          </div>

          <a routerLink="/shop" class="btn-editorial-link">
            {{ 'HOME.BEST_SELLERS.EXPLORE_ALL' | translate }}
          </a>
        </div>

        @if (bestSellersLoading()) {
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            @for (i of [1, 2, 3, 4]; track i) {
              <app-loading-skeleton height="360px" customClass="rounded-lg" />
            }
          </div>
        } @else if (bestSellers().length > 0) {
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            @for (item of bestSellers(); track item.product.id) {
              <app-product-card [product]="item.product" class="h-full" />
            }
          </div>
        }
      </section>

      <!-- 4. DISCOVERY: PATH 2 - SHOP BY INTENTION (EDITORIAL FOCUS) -->
      <section class="bg-[#FCFBF9] border-y border-[#E2DDD2] py-16 sm:py-24">
        <div class="atelier-container">
          <div class="max-w-2xl mb-12">
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'HOME.INTENTION_SHOP.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-section-title font-bold text-[#1A1A1D] mt-2 mb-3">
              {{ 'HOME.INTENTION_SHOP.TITLE' | translate }}
            </h2>
            <p class="text-sm text-[#5F5D56] leading-relaxed">
              {{ 'HOME.INTENTION_SHOP.DESC' | translate }}
            </p>
          </div>

          <!-- Intention selector tabs -->
          <div class="flex flex-wrap items-center gap-3 mb-10">
            @for (intent of intentions(); track intent.id) {
              <button
                type="button"
                (click)="selectIntention(intent.id)"
                [class.bg-[#10523C]]="selectedIntentionId() === intent.id"
                [class.text-[#FCFBF9]]="selectedIntentionId() === intent.id"
                [class.border-[#10523C]]="selectedIntentionId() === intent.id"
                [class.bg-[#FCFBF9]]="selectedIntentionId() !== intent.id"
                [class.text-[#1A1A1D]]="selectedIntentionId() !== intent.id"
                [class.border-[#E2DDD2]]="selectedIntentionId() !== intent.id"
                class="px-5 py-2.5 rounded-full border text-xs uppercase tracking-widest font-semibold transition-all duration-200 hover:border-[#10523C] cursor-pointer shadow-2xs"
              >
                {{ getIntentionItemName(intent) }}
              </button>
            }
          </div>

          <!-- Intention Selected Products -->
          @if (selectedIntentionProductsLoading()) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              @for (i of [1, 2, 3, 4]; track i) {
                <app-loading-skeleton height="380px" customClass="rounded-lg" />
              }
            </div>
          } @else if (selectedIntentionProducts().length > 0) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
              @for (prod of selectedIntentionProducts(); track prod.id) {
                <app-product-card [product]="prod" class="h-full" />
              }
            </div>
          } @else {
            <div class="text-center py-12 text-sm text-[#8D8A81]">
              {{ 'HOME.INTENTION_SHOP.EMPTY' | translate }}
            </div>
          }
        </div>
      </section>

      <!-- 5. EDITORIAL MANIFESTO / PHILOSOPHY -->
      <section class="atelier-container">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div class="lg:col-span-4 space-y-4">
            <span class="text-eyebrow text-[#8A7029]">
              {{ 'HOME.PHILOSOPHY.SUBTITLE' | translate }}
            </span>
            <h2 class="font-display text-3xl sm:text-4xl font-bold text-[#1A1A1D]">
              {{ 'HOME.PHILOSOPHY.TITLE' | translate }}
            </h2>
            <p class="text-sm text-[#5F5D56] leading-relaxed">
              {{ 'HOME.PHILOSOPHY.QUOTE' | translate }}
            </p>
          </div>

          <div class="lg:col-span-8">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div class="space-y-2.5 p-6 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2]">
                <span class="text-xs uppercase tracking-widest text-[#8A7029] font-bold">
                  {{ 'HOME.PHILOSOPHY.PILLARS.I_TITLE' | translate }}
                </span>
                <p class="text-xs text-[#5F5D56] leading-relaxed">
                  {{ 'HOME.PHILOSOPHY.PILLARS.I_DESC' | translate }}
                </p>
              </div>

              <div class="space-y-2.5 p-6 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2]">
                <span class="text-xs uppercase tracking-widest text-[#8A7029] font-bold">
                  {{ 'HOME.PHILOSOPHY.PILLARS.II_TITLE' | translate }}
                </span>
                <p class="text-xs text-[#5F5D56] leading-relaxed">
                  {{ 'HOME.PHILOSOPHY.PILLARS.II_DESC' | translate }}
                </p>
              </div>

              <div class="space-y-2.5 p-6 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2]">
                <span class="text-xs uppercase tracking-widest text-[#8A7029] font-bold">
                  {{ 'HOME.PHILOSOPHY.PILLARS.III_TITLE' | translate }}
                </span>
                <p class="text-xs text-[#5F5D56] leading-relaxed">
                  {{ 'HOME.PHILOSOPHY.PILLARS.III_DESC' | translate }}
                </p>
              </div>
            </div>

            <div class="pt-6">
              <a routerLink="/about" class="btn-editorial-link">
                {{ 'HOME.PHILOSOPHY.CTA' | translate }}
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. EDITORIAL NEWSLETTER / THRESHOLD BANNER -->
      <section class="atelier-container">
        <div class="bg-[#0D2B1D] text-[#FCFBF9] rounded-2xl p-8 sm:p-14 lg:p-20 text-center relative overflow-hidden border border-[#8A7029]/30 shadow-xl">
          <div class="max-w-xl mx-auto space-y-6 relative z-10">
            <span class="text-[11px] uppercase tracking-[0.25em] text-[#CBB26A] font-semibold">
              {{ 'HOME.NEWSLETTER.SUBTITLE' | translate }}
            </span>

            <h2 class="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              {{ 'HOME.NEWSLETTER.TITLE' | translate }}
            </h2>

            <p class="text-sm text-[#F4F1EA]/80 leading-relaxed font-light">
              {{ 'HOME.NEWSLETTER.DESC' | translate }}
            </p>

            <div class="pt-4">
              <a routerLink="/shop" class="btn-gold-accent px-8 py-3.5 inline-block text-xs uppercase tracking-widest font-semibold shadow-lg">
                {{ 'HOME.NEWSLETTER.CTA' | translate }} →
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  public readonly localeService = inject(LocaleService);
  private readonly platformId = inject(PLATFORM_ID);

  public readonly categories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly categoriesLoading = this.store.selectSignal(CategoriesSelectors.loading);
  public readonly intentions = this.store.selectSignal(IntentionsSelectors.intentions);
  public readonly bestSellers = this.store.selectSignal(ProductsSelectors.bestSellers);
  public readonly bestSellersLoading = this.store.selectSignal(ProductsSelectors.bestSellersLoading);

  public readonly productsByIntention = this.store.selectSignal(
    IntentionsSelectors.productsByIntentionId,
  );
  public readonly loadingIntentions = this.store.selectSignal(
    IntentionsSelectors.loadingIntentions,
  );

  public readonly selectedIntentionId = signal<string | null>(null);

  public readonly selectedIntentionProducts = computed<ProductListItem[]>(() => {
    const id = this.selectedIntentionId();
    if (!id) return [];
    return this.productsByIntention()[id] ?? [];
  });

  public readonly selectedIntentionProductsLoading = computed<boolean>(() => {
    const id = this.selectedIntentionId();
    if (!id) return false;
    return !!this.loadingIntentions()[id];
  });

  // Organic Editorial Showcase State
  public readonly currentSlideIndex = signal(0);
  public readonly isHovered = signal(false);
  private autoSlideTimer: any = null;
  private touchStartX = 0;

  // Products displayed in hero showcase
  public readonly heroProducts = computed<ProductListItem[]>(() => {
    const bs = this.bestSellers();
    if (bs && bs.length > 0) {
      return bs.map((item) => item.product);
    }
    return [];
  });

  // Active Center Product
  public readonly activeProduct = computed<ProductListItem | null>(() => {
    const prods = this.heroProducts();
    if (prods.length === 0) return null;
    const idx = this.currentSlideIndex();
    return prods[idx % prods.length] || null;
  });

  constructor() {
    // Initial data dispatches (reuses store cache if already loaded)
    this.store.dispatch(new LoadCategories());
    this.store.dispatch(new LoadIntentions());
    this.store.dispatch(new LoadBestSellers({ period: BestSellerPeriod.AllTime, take: 8 }));

    // Automatically select first intention reactively
    effect(() => {
      const ints = this.intentions();
      untracked(() => {
        if (ints && ints.length > 0) {
          const current = this.selectedIntentionId();
          const exists = current && ints.some((i) => i.id === current);
          if (!exists) {
            this.selectIntention(ints[0].id);
          }
        }
      });
    });
  }

  ngOnInit(): void {
    // Initialize auto-sliding timer in browser
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoSlide();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  private startAutoSlide(): void {
    this.stopAutoSlide();
    this.autoSlideTimer = setInterval(() => {
      if (!this.isHovered() && this.heroProducts().length > 1) {
        this.nextSlide();
      }
    }, 3000);
  }

  private stopAutoSlide(): void {
    if (this.autoSlideTimer) {
      clearInterval(this.autoSlideTimer);
      this.autoSlideTimer = null;
    }
  }

  private resetAutoSlideTimer(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoSlide();
    }
  }

  public pauseSlider(): void {
    this.isHovered.set(true);
  }

  public resumeSlider(): void {
    this.isHovered.set(false);
  }

  public nextSlide(event?: Event): void {
    if (event) event.stopPropagation();
    const total = this.heroProducts().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((i) => (i + 1) % total);
    this.resetAutoSlideTimer();
  }

  public prevSlide(event?: Event): void {
    if (event) event.stopPropagation();
    const total = this.heroProducts().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((i) => (i - 1 + total) % total);
    this.resetAutoSlideTimer();
  }

  public goToSlide(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.currentSlideIndex.set(index);
    this.resetAutoSlideTimer();
  }

  public isCurrentSlide(index: number): boolean {
    return this.currentSlideIndex() === index;
  }

  public onSlideCardClick(index: number): void {
    const total = this.heroProducts().length;
    if (total <= 1) {
      const prod = this.heroProducts()[0];
      if (prod) this.router.navigate(['/product', prod.slug?.value || prod.id]);
      return;
    }

    const current = this.currentSlideIndex();
    let diff = (index - current) % total;
    if (diff < 0) diff += total;

    if (diff === 0) {
      // Center card -> navigate directly to product detail
      const prod = this.heroProducts()[index];
      if (prod) this.router.navigate(['/product', prod.slug?.value || prod.id]);
    } else if (diff === 1) {
      // Right preview -> smoothly rotate to center
      this.nextSlide();
    } else if (diff === total - 1) {
      // Left preview -> smoothly rotate to center
      this.prevSlide();
    } else {
      this.goToSlide(index);
    }
  }

  public getSlideTransform(index: number): string {
    const total = this.heroProducts().length;
    if (total <= 1) return 'translateX(0) scale(1)';
    const current = this.currentSlideIndex();
    let diff = (index - current) % total;
    if (diff < 0) diff += total;

    if (diff === 0) {
      // Center active product
      return 'translateX(0%) scale(1)';
    } else if (diff === 1) {
      // Right peripheral preview
      return 'translateX(55%) scale(0.82)';
    } else if (diff === total - 1) {
      // Left peripheral preview
      return 'translateX(-55%) scale(0.82)';
    } else {
      // Off-stage
      return 'translateX(0%) scale(0.6)';
    }
  }

  public getSlideClasses(index: number): string {
    const total = this.heroProducts().length;
    if (total <= 1) return 'opacity-100 z-20 shadow-[0_20px_35px_-10px_rgba(10,26,18,0.18)] pointer-events-auto cursor-pointer';
    const current = this.currentSlideIndex();
    let diff = (index - current) % total;
    if (diff < 0) diff += total;

    if (diff === 0) {
      // Center Active: Full presence, natural soft shadow
      return 'opacity-100 z-20 shadow-[0_20px_40px_-10px_rgba(10,26,18,0.2)] pointer-events-auto cursor-pointer';
    } else if (diff === 1 || diff === total - 1) {
      // Left & Right Preview: 55% opacity, clickable preview
      return 'opacity-55 z-10 shadow-[0_8px_20px_-8px_rgba(10,26,18,0.08)] hover:opacity-75 pointer-events-auto cursor-pointer';
    } else {
      // Off-stage
      return 'opacity-0 z-0 pointer-events-none';
    }
  }

  public getSlideFilter(index: number): string {
    const total = this.heroProducts().length;
    if (total <= 1) return 'blur(0px)';
    const current = this.currentSlideIndex();
    let diff = (index - current) % total;
    if (diff < 0) diff += total;

    if (diff === 0) {
      return 'blur(0px)';
    } else if (diff === 1 || diff === total - 1) {
      return 'blur(1.5px)';
    } else {
      return 'blur(3px)';
    }
  }

  public getProductImage(prod: ProductListItem): string {
    const images = prod.images;
    if (!images || images.length === 0) return '/images/witchlab_hero.png';
    const primary = images.find((i: any) => i?.isPrimary);
    return primary ? primary.url : images[0]?.url || '/images/witchlab_hero.png';
  }

  public getCategoryItemName(cat: CategoryItem): string {
    return getLocalizedName(cat.translations, this.localeService.active(), 'Category');
  }

  public getCategoryItemDesc(cat: CategoryItem): string {
    return getLocalizedDescription(cat.translations, this.localeService.active(), '');
  }

  public getIntentionItemName(intent: IntentionItem): string {
    return getLocalizedName(intent.translations, this.localeService.active(), 'Intention');
  }

  public getProductName(prod: ProductListItem): string {
    return getLocalizedName(prod.translations, this.localeService.active(), 'Ritual Object');
  }

  public getCategoryName(prod: ProductListItem): string {
    return getLocalizedName(prod.category?.translations, this.localeService.active(), 'Atelier Collection');
  }

  public onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.pauseSlider();
  }

  public onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const diff = touchEndX - this.touchStartX;
    if (Math.abs(diff) > 40) {
      if (diff < 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    }
    this.resumeSlider();
  }

  public selectIntention(id: string): void {
    this.selectedIntentionId.set(id);
    this.store.dispatch(new LoadIntentionProducts(id, 0, 4));
  }
}
