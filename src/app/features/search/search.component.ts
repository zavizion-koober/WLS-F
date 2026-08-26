import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

import { ProductsSelectors } from '@store/products/products.selectors';
import { LoadProducts } from '@store/products/products.actions';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { IntentionsSelectors } from '@store/intentions/intentions.selectors';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { IconComponent } from '@shared/components/icon/icon.component';
import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName } from '@core/utils/translation.utils';
import { CategoryItem } from '@store/categories/categories.models';
import { buildProductSearchFilter } from '@core/utils/search.utils';
import {
  ProductSortInput,
  SortEnumType,
} from 'src/generated/graphql';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TranslateModule,
    ProductCardComponent,
    LoadingSkeletonComponent,
    IconComponent,
  ],
  template: `
    <div class="atelier-container pt-8 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-6">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.HOME' | translate }}</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'SEARCH.TITLE' | translate }}</span>
      </nav>

      <!-- Header & Search Input -->
      <div class="max-w-2xl mb-10">
        <span class="text-eyebrow text-[#8A7029]">
          {{ 'SEARCH.SUBTITLE' | translate }}
        </span>
        <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1 mb-6">
          {{ 'SEARCH.HEADING' | translate }}
        </h1>

        <!-- Live Search Bar -->
        <form (submit)="onSearchSubmit($event)" class="relative flex items-center">
          <input
            type="text"
            [ngModel]="searchQuery"
            (ngModelChange)="onQueryInput($event)"
            name="query"
            [placeholder]="'SEARCH.PLACEHOLDER' | translate"
            class="w-full h-14 pl-12 pr-12 rounded-xl bg-[#FCFBF9] border border-[#E2DDD2] text-sm text-[#1A1A1D] shadow-xs focus:outline-none focus:border-[#10523C] focus:ring-1 focus:ring-[#10523C] transition-all font-body"
            autocomplete="off"
            spellcheck="false"
          />

          <span class="absolute left-4 text-[#8D8A81]">
            <app-icon name="search" [size]="20" />
          </span>

          @if (searchQuery) {
            <button
              type="button"
              (click)="clearSearch()"
              class="absolute right-4 text-[#8D8A81] hover:text-[#1A1A1D] p-1 cursor-pointer"
              aria-label="Clear search"
            >
              <app-icon name="close" [size]="16" />
            </button>
          }
        </form>

        <!-- Popular / Suggested Searches -->
        <div class="flex items-center gap-2 pt-3 flex-wrap">
          <span class="text-[11px] uppercase tracking-wider text-[#8D8A81] font-medium">
            {{ 'SEARCH.POPULAR' | translate }}:
          </span>
          @for (term of popularTerms; track term) {
            <button
              type="button"
              (click)="selectPopularTerm(term)"
              class="px-2.5 py-1 rounded-full border border-[#E2DDD2] bg-[#FCFBF9] hover:border-[#10523C] text-[11px] text-[#5F5D56] hover:text-[#10523C] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            >
              {{ term }}
            </button>
          }
        </div>
      </div>

      <!-- Results Header & Sort Controls -->
      <div class="flex items-center justify-between pb-4 mb-8 border-b border-[#E2DDD2]">
        <div class="text-xs uppercase tracking-widest text-[#5F5D56] font-medium flex items-center gap-2">
          @if (searchQuery.trim()) {
            <span>{{ 'SEARCH.RESULTS_FOR' | translate: { query: searchQuery, count: totalCount() } }}</span>
          } @else {
            <span>{{ 'SEARCH.BROWSE_ALL' | translate: { count: totalCount() } }}</span>
          }
        </div>

        <div class="flex items-center gap-2">
          <label for="search-sort" class="text-xs uppercase tracking-widest text-[#8D8A81] font-medium hidden sm:inline">
            {{ 'SHOP.CONTROLS.SORT_BY' | translate }}:
          </label>
          <select
            id="search-sort"
            [ngModel]="selectedSort()"
            (ngModelChange)="onSortChange($event)"
            class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-lg px-3 py-1.5 text-xs text-[#1A1A1D] focus:outline-none focus:border-[#10523C] cursor-pointer"
          >
            <option value="featured">{{ 'SHOP.CONTROLS.SORT_FEATURED' | translate }}</option>
            <option value="price_asc">{{ 'SHOP.CONTROLS.SORT_PRICE_ASC' | translate }}</option>
            <option value="price_desc">{{ 'SHOP.CONTROLS.SORT_PRICE_DESC' | translate }}</option>
          </select>
        </div>
      </div>

      <!-- Products Grid -->
      @if (loading()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
            <app-loading-skeleton height="380px" customClass="rounded-lg" />
          }
        </div>
      } @else if (products().length === 0) {
        <div class="py-12 px-4 text-center space-y-6 max-w-md mx-auto">
          <div class="w-16 h-16 rounded-full bg-[#F4F1EA] flex items-center justify-center mx-auto text-[#8A7029]">
            <app-icon name="search" [size]="28" />
          </div>
          <div class="space-y-2">
            <h3 class="font-display text-xl font-bold text-[#1A1A1D]">
              {{ 'SEARCH.EMPTY_TITLE' | translate }}
            </h3>
            <p class="text-xs sm:text-sm text-[#5F5D56] leading-relaxed">
              {{ 'SEARCH.EMPTY_DESC' | translate }}
            </p>
          </div>

          <!-- Suggested Categories -->
          @if (categories().length > 0) {
            <div class="space-y-3 pt-2">
              <span class="text-[11px] uppercase tracking-widest text-[#8A7029] font-medium block">
                {{ 'SHOP.FILTERS.CATEGORIES' | translate }}
              </span>
              <div class="flex flex-wrap justify-center gap-2">
                @for (cat of categories().slice(0, 5); track cat.id) {
                  <a
                    [routerLink]="['/shop']"
                    [queryParams]="{ categoryId: cat.id }"
                    class="px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-[#FCFBF9] hover:border-[#10523C] text-xs font-medium text-[#1A1A1D] hover:text-[#10523C] transition-all"
                  >
                    {{ getCategoryName(cat) }}
                  </a>
                }
              </div>
            </div>
          }

          <a routerLink="/shop" class="btn-primary text-xs py-2.5 px-6 inline-block mt-4">
            {{ 'SEARCH.EMPTY_ACTION' | translate }}
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          @for (product of products(); track product.id) {
            <app-product-card [product]="product" class="h-full" />
          }
        </div>
      }
    </div>
  `,
})
export class SearchComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly localeService = inject(LocaleService);

  public searchQuery = '';
  public readonly selectedSort = signal<string>('featured');

  public readonly products = this.store.selectSignal(ProductsSelectors.products);
  public readonly totalCount = this.store.selectSignal(ProductsSelectors.totalCount);
  public readonly loading = this.store.selectSignal(ProductsSelectors.loading);
  public readonly categories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly intentions = this.store.selectSignal(IntentionsSelectors.intentions);

  public readonly popularTerms = ['Candles', 'Elixirs', 'Tarot', 'Protection', 'Incense', 'Love'];

  public getCategoryName(cat: CategoryItem): string {
    return getLocalizedName(cat.translations, this.localeService.active(), 'Category');
  }

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngOnInit(): void {
    // Synchronize query params
    this.route.queryParams.subscribe((params) => {
      const q = params['q'] || '';
      this.searchQuery = q;
      if (params['sort']) this.selectedSort.set(params['sort']);
      this.performSearch(q);
    });

    // Live search debounced input
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe((query) => {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: query.trim() || null },
          queryParamsHandling: 'merge',
        });
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  public onQueryInput(val: string): void {
    this.searchQuery = val;
    this.searchSubject.next(val);
  }

  public selectPopularTerm(term: string): void {
    this.searchQuery = term;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: term },
      queryParamsHandling: 'merge',
    });
  }

  public onSearchSubmit(event: Event): void {
    event.preventDefault();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.searchQuery.trim() || null },
      queryParamsHandling: 'merge',
    });
  }

  public clearSearch(): void {
    this.searchQuery = '';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }

  public onSortChange(sort: string): void {
    this.selectedSort.set(sort);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort },
      queryParamsHandling: 'merge',
    });
  }

  private performSearch(queryText: string): void {
    const where = buildProductSearchFilter(queryText);

    let order: ProductSortInput[] | undefined = undefined;
    if (this.selectedSort() === 'price_asc') {
      order = [{ pricing: { price: { amount: SortEnumType.Asc } } }];
    } else if (this.selectedSort() === 'price_desc') {
      order = [{ pricing: { price: { amount: SortEnumType.Desc } } }];
    }

    this.store.dispatch(new LoadProducts({ where, order, take: 24 }));
  }
}
