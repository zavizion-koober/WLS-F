import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName } from '@core/utils/translation.utils';
import { ProductsSelectors } from '@store/products/products.selectors';
import { LoadProducts } from '@store/products/products.actions';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { LoadCategories } from '@store/categories/categories.actions';
import { IntentionsSelectors } from '@store/intentions/intentions.selectors';
import { LoadIntentions } from '@store/intentions/intentions.actions';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import {
  ProductFilterInput,
  ProductSortInput,
  ProductStatus,
  SortEnumType,
  Zodiac,
} from 'src/generated/graphql';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TranslateModule,
    ProductCardComponent,
    LoadingSkeletonComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  template: `
    <div class="atelier-container pt-8 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-6">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.HOME' | translate }}</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'PRODUCT_DETAIL.SHOP' | translate }}</span>
      </nav>

      <!-- Header Banner -->
      <div class="mb-10 pb-8 border-b border-[#E2DDD2]">
        <span class="text-eyebrow text-[#8A7029]">
          {{ 'SHOP.HEADER.SUBTITLE' | translate }}
        </span>
        <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1 mb-3">
          {{ 'SHOP.HEADER.TITLE' | translate }}
        </h1>
        <p class="text-sm sm:text-base text-[#5F5D56] max-w-2xl leading-relaxed">
          {{ 'SHOP.HEADER.DESC' | translate }}
        </p>
      </div>

      <!-- Controls bar: Results Count, Mobile Filter Trigger, Sort Select -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#E2DDD2]/60">
        <!-- Results count & Mobile filter toggle -->
        <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <span class="text-xs uppercase tracking-widest text-[#5F5D56] font-medium">
            {{ totalCount() }} {{ 'SHOP.CONTROLS.ITEMS' | translate }}
          </span>

          <button
            type="button"
            (click)="filterDrawerOpen.set(true)"
            class="lg:hidden inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-[#FCFBF9] text-xs uppercase tracking-widest font-semibold text-[#1A1A1D] hover:border-[#10523C] cursor-pointer"
          >
            <app-icon name="filter" [size]="14" />
            <span>{{ 'SHOP.FILTERS.TITLE' | translate }}</span>
            @if (activeFilterCount() > 0) {
              <span class="w-4 h-4 bg-[#10523C] text-[#FCFBF9] text-[10px] rounded-full flex items-center justify-center">
                {{ activeFilterCount() }}
              </span>
            }
          </button>
        </div>

        <!-- Sorting dropdown -->
        <div class="flex items-center gap-2 self-end sm:self-auto">
          <label for="shop-sort" class="text-xs uppercase tracking-widest text-[#8D8A81] font-medium">
            {{ 'SHOP.CONTROLS.SORT_BY' | translate }}:
          </label>
          <select
            id="shop-sort"
            [ngModel]="selectedSort()"
            (ngModelChange)="onSortChange($event)"
            class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1D] font-medium focus:outline-none focus:border-[#10523C] cursor-pointer"
          >
            <option value="featured">{{ 'SHOP.CONTROLS.SORT_FEATURED' | translate }}</option>
            <option value="price_asc">{{ 'SHOP.CONTROLS.SORT_PRICE_ASC' | translate }}</option>
            <option value="price_desc">{{ 'SHOP.CONTROLS.SORT_PRICE_DESC' | translate }}</option>
          </select>
        </div>
      </div>

      <!-- Applied Filters Pills -->
      @if (activeFilterCount() > 0) {
        <div class="flex flex-wrap items-center gap-2 mb-8">
          <span class="text-xs text-[#8D8A81] mr-1">{{ 'SHOP.FILTERS.ACTIVE' | translate }}</span>

          @if (selectedCategoryId()) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FCFBF9] border border-[#E2DDD2] rounded-full text-xs text-[#1A1A1D]">
              <span>{{ getCategoryName(selectedCategoryId()!) }}</span>
              <button type="button" (click)="setCategory(null)" class="text-[#8D8A81] hover:text-[#1A1A1D] cursor-pointer">
                <app-icon name="close" [size]="12" />
              </button>
            </span>
          }

          @if (selectedIntentionId()) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FCFBF9] border border-[#E2DDD2] rounded-full text-xs text-[#1A1A1D]">
              <span>{{ getIntentionName(selectedIntentionId()!) }}</span>
              <button type="button" (click)="setIntention(null)" class="text-[#8D8A81] hover:text-[#1A1A1D] cursor-pointer">
                <app-icon name="close" [size]="12" />
              </button>
            </span>
          }

          @if (selectedZodiac()) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FCFBF9] border border-[#E2DDD2] rounded-full text-xs text-[#1A1A1D]">
              <span>✦ {{ 'ZODIAC.' + selectedZodiac() | translate }}</span>
              <button type="button" (click)="setZodiac(null)" class="text-[#8D8A81] hover:text-[#1A1A1D] cursor-pointer">
                <app-icon name="close" [size]="12" />
              </button>
            </span>
          }

          @if (appliedMinPrice() !== null || appliedMaxPrice() !== null) {
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FCFBF9] border border-[#E2DDD2] rounded-full text-xs text-[#1A1A1D]">
              <span>₾{{ appliedMinPrice() || 0 }} - ₾{{ appliedMaxPrice() || '∞' }}</span>
              <button type="button" (click)="clearPriceFilter()" class="text-[#8D8A81] hover:text-[#1A1A1D] cursor-pointer">
                <app-icon name="close" [size]="12" />
              </button>
            </span>
          }

          <button
            type="button"
            (click)="clearAllFilters()"
            class="text-xs text-[#8A7029] hover:underline cursor-pointer ml-2"
          >
            {{ 'SHOP.FILTERS.CLEAR_ALL' | translate }}
          </button>
        </div>
      }

      <!-- Main Layout: Sidebar Filters (3 cols) + Product Grid (9 cols) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:block lg:col-span-3 space-y-8 sticky top-24">
          <!-- Category filter -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
              {{ 'SHOP.FILTERS.CATEGORY' | translate }}
            </h4>
            <div class="space-y-1.5">
              <button
                type="button"
                (click)="setCategory(null)"
                [class.text-[#10523C]]="selectedCategoryId() === null"
                [class.font-semibold]="selectedCategoryId() === null"
                class="w-full text-left text-xs py-1 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors cursor-pointer"
              >
                {{ 'SHOP.FILTERS.ALL_COLLECTIONS' | translate }}
              </button>

              @for (cat of categories(); track cat.id) {
                <button
                  type="button"
                  (click)="setCategory(cat.id)"
                  [class.text-[#10523C]]="selectedCategoryId() === cat.id"
                  [class.font-semibold]="selectedCategoryId() === cat.id"
                  class="w-full text-left text-xs py-1 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{{ getCategoryName(cat.id) }}</span>
                  @if (selectedCategoryId() === cat.id) {
                    <app-icon name="check" [size]="14" customClass="text-[#10523C]" />
                  }
                </button>
              }
            </div>
          </div>

          <div class="gold-rule"></div>

          <!-- Intention filter -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
              {{ 'SHOP.FILTERS.INTENTION' | translate }}
            </h4>
            <div class="space-y-1.5">
              <button
                type="button"
                (click)="setIntention(null)"
                [class.text-[#10523C]]="selectedIntentionId() === null"
                [class.font-semibold]="selectedIntentionId() === null"
                class="w-full text-left text-xs py-1 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors cursor-pointer"
              >
                {{ 'SHOP.FILTERS.ALL_INTENTIONS' | translate }}
              </button>

              @for (intent of intentions(); track intent.id) {
                <button
                  type="button"
                  (click)="setIntention(intent.id)"
                  [class.text-[#10523C]]="selectedIntentionId() === intent.id"
                  [class.font-semibold]="selectedIntentionId() === intent.id"
                  class="w-full text-left text-xs py-1 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{{ getIntentionName(intent.id) }}</span>
                  @if (selectedIntentionId() === intent.id) {
                    <app-icon name="check" [size]="14" customClass="text-[#10523C]" />
                  }
                </button>
              }
            </div>
          </div>

          <div class="gold-rule"></div>

          <!-- Zodiac filter -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
              {{ 'SHOP.FILTERS.ASTROLOGICAL' | translate }}
            </h4>
            <select
              [ngModel]="selectedZodiac()"
              (ngModelChange)="setZodiac($event)"
              class="w-full bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg px-3 py-2 text-xs text-[#1A1A1D] focus:outline-none focus:border-[#10523C] cursor-pointer"
            >
              <option [ngValue]="null">{{ 'SHOP.FILTERS.ALL_SIGNS' | translate }}</option>
              @for (sign of zodiacSigns; track sign) {
                <option [value]="sign">{{ 'ZODIAC.' + sign | translate }}</option>
              }
            </select>
          </div>

          <div class="gold-rule"></div>

          <!-- Price range filter -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
              {{ 'SHOP.FILTERS.PRICE_RANGE' | translate }} (₾)
            </h4>
            <div class="flex items-center gap-2">
              <input
                type="number"
                [placeholder]="'SHOP.FILTERS.MIN' | translate"
                [ngModel]="minPrice()"
                (ngModelChange)="minPrice.set($event)"
                class="w-full bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1D] focus:outline-none focus:border-[#10523C]"
              />
              <span class="text-[#8D8A81] text-xs">-</span>
              <input
                type="number"
                [placeholder]="'SHOP.FILTERS.MAX' | translate"
                [ngModel]="maxPrice()"
                (ngModelChange)="maxPrice.set($event)"
                class="w-full bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg px-2.5 py-1.5 text-xs text-[#1A1A1D] focus:outline-none focus:border-[#10523C]"
              />
            </div>
            <button
              type="button"
              (click)="applyPriceFilter()"
              class="w-full btn-secondary text-[11px] py-2"
            >
              {{ 'SHOP.FILTERS.APPLY_PRICE' | translate }}
            </button>
          </div>
        </aside>

        <!-- Product Grid (9 cols desktop) -->
        <main class="lg:col-span-9">
          @if (loading()) {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                <app-loading-skeleton height="380px" customClass="rounded-lg" />
              }
            </div>
          } @else if (products().length === 0) {
            <app-empty-state
              icon="search"
              [title]="'SHOP.EMPTY.NO_PRODUCTS' | translate"
              [actionLabel]="'SHOP.EMPTY.CLEAR_FILTERS' | translate"
              (action)="clearAllFilters()"
            />
          } @else {
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              @for (product of products(); track product.id) {
                <app-product-card [product]="product" class="h-full" />
              }
            </div>
          }
        </main>
      </div>
    </div>

    <!-- Mobile Filter Drawer -->
    @if (filterDrawerOpen()) {
      <div
        class="fixed inset-0 bg-[#050507]/60 backdrop-blur-xs z-50 transition-opacity duration-300 lg:hidden"
        (click)="filterDrawerOpen.set(false)"
      ></div>

      <aside
        class="fixed inset-y-0 right-0 w-[85%] max-w-[340px] bg-[#FCFBF9] border-l border-[#E2DDD2] z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out shadow-2xl lg:hidden"
      >
        <div class="p-5 border-b border-[#E2DDD2] flex items-center justify-between bg-[#F4F1EA]">
          <h3 class="text-sm font-semibold uppercase tracking-widest text-[#1A1A1D]">
            {{ 'SHOP.FILTERS.TITLE' | translate }}
          </h3>
          <button
            type="button"
            (click)="filterDrawerOpen.set(false)"
            class="p-1.5 text-[#5F5D56] hover:text-[#1A1A1D]"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 space-y-6">
          <!-- Category -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#8A7029]">
              {{ 'SHOP.FILTERS.CATEGORY' | translate }}
            </h4>
            <div class="space-y-1">
              <button
                type="button"
                (click)="setCategory(null)"
                [class.text-[#10523C]]="selectedCategoryId() === null"
                [class.font-semibold]="selectedCategoryId() === null"
                class="w-full text-left text-xs py-1.5 text-[#5F5D56]"
              >
                {{ 'SHOP.FILTERS.ALL_COLLECTIONS' | translate }}
              </button>
              @for (cat of categories(); track cat.id) {
                <button
                  type="button"
                  (click)="setCategory(cat.id)"
                  [class.text-[#10523C]]="selectedCategoryId() === cat.id"
                  [class.font-semibold]="selectedCategoryId() === cat.id"
                  class="w-full text-left text-xs py-1.5 text-[#5F5D56] flex items-center justify-between"
                >
                  <span>{{ getCategoryName(cat.id) }}</span>
                  @if (selectedCategoryId() === cat.id) {
                    <app-icon name="check" [size]="14" customClass="text-[#10523C]" />
                  }
                </button>
              }
            </div>
          </div>

          <!-- Intention -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#8A7029]">
              {{ 'SHOP.FILTERS.INTENTION' | translate }}
            </h4>
            <div class="space-y-1">
              <button
                type="button"
                (click)="setIntention(null)"
                [class.text-[#10523C]]="selectedIntentionId() === null"
                [class.font-semibold]="selectedIntentionId() === null"
                class="w-full text-left text-xs py-1.5 text-[#5F5D56]"
              >
                {{ 'SHOP.FILTERS.ALL_INTENTIONS' | translate }}
              </button>
              @for (intent of intentions(); track intent.id) {
                <button
                  type="button"
                  (click)="setIntention(intent.id)"
                  [class.text-[#10523C]]="selectedIntentionId() === intent.id"
                  [class.font-semibold]="selectedIntentionId() === intent.id"
                  class="w-full text-left text-xs py-1.5 text-[#5F5D56] flex items-center justify-between"
                >
                  <span>{{ getIntentionName(intent.id) }}</span>
                  @if (selectedIntentionId() === intent.id) {
                    <app-icon name="check" [size]="14" customClass="text-[#10523C]" />
                  }
                </button>
              }
            </div>
          </div>

          <!-- Zodiac -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[#8A7029]">
              {{ 'SHOP.FILTERS.ASTROLOGICAL' | translate }}
            </h4>
            <select
              [ngModel]="selectedZodiac()"
              (ngModelChange)="setZodiac($event)"
              class="w-full bg-[#F4F1EA] border border-[#E2DDD2] rounded-lg px-3 py-2 text-xs text-[#1A1A1D]"
            >
              <option [ngValue]="null">{{ 'SHOP.FILTERS.ALL_SIGNS' | translate }}</option>
              @for (sign of zodiacSigns; track sign) {
                <option [value]="sign">{{ 'ZODIAC.' + sign | translate }}</option>
              }
            </select>
          </div>
        </div>

        <div class="p-5 border-t border-[#E2DDD2] bg-[#F4F1EA] flex gap-3">
          <button
            type="button"
            (click)="clearAllFilters(); filterDrawerOpen.set(false)"
            class="flex-1 btn-secondary py-2.5 text-xs text-center"
          >
            {{ 'SHOP.FILTERS.CLEAR_ALL' | translate }}
          </button>
          <button
            type="button"
            (click)="filterDrawerOpen.set(false)"
            class="flex-1 btn-primary py-2.5 text-xs text-center"
          >
            {{ 'SHOP.FILTERS.DONE' | translate }}
          </button>
        </div>
      </aside>
    }
  `,
})
export class ShopComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly localeService = inject(LocaleService);

  public readonly filterDrawerOpen = signal(false);

  public readonly products = this.store.selectSignal(ProductsSelectors.products);
  public readonly totalCount = this.store.selectSignal(ProductsSelectors.totalCount);
  public readonly loading = this.store.selectSignal(ProductsSelectors.loading);

  public readonly categories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly intentions = this.store.selectSignal(IntentionsSelectors.intentions);

  public readonly selectedCategoryId = signal<string | null>(null);
  public readonly selectedIntentionId = signal<string | null>(null);
  public readonly selectedZodiac = signal<Zodiac | null>(null);
  public readonly selectedSort = signal<string>('featured');

  public readonly minPrice = signal<number | null>(null);
  public readonly maxPrice = signal<number | null>(null);
  public readonly appliedMinPrice = signal<number | null>(null);
  public readonly appliedMaxPrice = signal<number | null>(null);

  public readonly zodiacSigns: Zodiac[] = [
    Zodiac.Aries,
    Zodiac.Taurus,
    Zodiac.Gemini,
    Zodiac.Cancer,
    Zodiac.Leo,
    Zodiac.Virgo,
    Zodiac.Libra,
    Zodiac.Scorpio,
    Zodiac.Sagittarius,
    Zodiac.Capricorn,
    Zodiac.Aquarius,
    Zodiac.Pisces,
  ];

  constructor() {}

  public activeFilterCount(): number {
    let count = 0;
    if (this.selectedCategoryId()) count++;
    if (this.selectedIntentionId()) count++;
    if (this.selectedZodiac()) count++;
    if (this.appliedMinPrice() !== null || this.appliedMaxPrice() !== null) count++;
    return count;
  }

  ngOnInit(): void {
    this.store.dispatch(new LoadCategories());
    this.store.dispatch(new LoadIntentions());

    this.route.queryParams.subscribe((params) => {
      this.selectedCategoryId.set(params['categoryId'] || null);
      this.selectedIntentionId.set(params['intentionId'] || null);
      this.selectedZodiac.set((params['zodiac'] as Zodiac) || null);
      this.selectedSort.set(params['sort'] || 'featured');
      if (params['minPrice']) {
        const val = Number(params['minPrice']);
        this.minPrice.set(val);
        this.appliedMinPrice.set(val);
      } else {
        this.minPrice.set(null);
        this.appliedMinPrice.set(null);
      }
      if (params['maxPrice']) {
        const val = Number(params['maxPrice']);
        this.maxPrice.set(val);
        this.appliedMaxPrice.set(val);
      } else {
        this.maxPrice.set(null);
        this.appliedMaxPrice.set(null);
      }

      this.fetchProducts(false);
    });
  }

  public setCategory(id: string | null): void {
    this.selectedCategoryId.set(id);
    this.updateQueryParams({ categoryId: id });
  }

  public setIntention(id: string | null): void {
    this.selectedIntentionId.set(id);
    this.updateQueryParams({ intentionId: id });
  }

  public setZodiac(zodiac: Zodiac | null): void {
    this.selectedZodiac.set(zodiac);
    this.updateQueryParams({ zodiac });
  }

  public onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.updateQueryParams({ sort });
  }

  public applyPriceFilter(): void {
    this.appliedMinPrice.set(this.minPrice());
    this.appliedMaxPrice.set(this.maxPrice());
    this.updateQueryParams({
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
    });
  }

  public clearPriceFilter(): void {
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.appliedMinPrice.set(null);
    this.appliedMaxPrice.set(null);
    this.updateQueryParams({ minPrice: null, maxPrice: null });
  }

  public clearAllFilters(): void {
    this.selectedCategoryId.set(null);
    this.selectedIntentionId.set(null);
    this.selectedZodiac.set(null);
    this.minPrice.set(null);
    this.maxPrice.set(null);
    this.appliedMinPrice.set(null);
    this.appliedMaxPrice.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
    });
  }

  public getCategoryName(id: string): string {
    const cat = this.categories().find((c) => c.id === id);
    return getLocalizedName(cat?.translations, this.localeService.active(), 'Category');
  }

  public getIntentionName(id: string): string {
    const intent = this.intentions().find((i) => i.id === id);
    return getLocalizedName(intent?.translations, this.localeService.active(), 'Intention');
  }

  private updateQueryParams(params: Record<string, any>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private fetchProducts(forceRefresh: boolean = false): void {
    const where: ProductFilterInput = {
      status: { eq: ProductStatus.Published },
      isDeleted: { eq: false },
    };

    if (this.selectedCategoryId()) {
      where.categoryId = { eq: this.selectedCategoryId() };
    }

    if (this.selectedIntentionId()) {
      where.intentionId = { eq: this.selectedIntentionId() };
    }

    if (this.selectedZodiac()) {
      where.zodiac = { eq: this.selectedZodiac() };
    }

    if (this.appliedMinPrice() !== null || this.appliedMaxPrice() !== null) {
      where.pricing = {
        price: {
          amount: {},
        },
      };
      if (this.appliedMinPrice() !== null) {
        where.pricing.price!.amount!.gte = this.appliedMinPrice()!;
      }
      if (this.appliedMaxPrice() !== null) {
        where.pricing.price!.amount!.lte = this.appliedMaxPrice()!;
      }
    }

    let order: ProductSortInput[] | undefined = undefined;
    if (this.selectedSort() === 'price_asc') {
      order = [{ pricing: { price: { amount: SortEnumType.Asc } } }];
    } else if (this.selectedSort() === 'price_desc') {
      order = [{ pricing: { price: { amount: SortEnumType.Desc } } }];
    }

    this.store.dispatch(
      new LoadProducts(
        {
          where,
          order,
          take: 24,
        },
        forceRefresh,
      ),
    );
  }
}
