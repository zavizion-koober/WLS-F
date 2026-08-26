import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject, Subscription, switchMap, of, catchError } from 'rxjs';

import { SearchModalService } from '@core/services/search-modal.service';
import { ProductsService } from '@store/products/products.service';
import { ProductListItem } from '@store/products/products.models';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { IntentionsSelectors } from '@store/intentions/intentions.selectors';
import { IconComponent } from '@shared/components/icon/icon.component';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { PricePipe } from '@shared/pipes/price.pipe';
import { buildProductSearchFilter, rankSearchResults } from '@core/utils/search.utils';
import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName } from '@core/utils/translation.utils';
import { CategoryItem } from '@store/categories/categories.models';
import { IntentionItem } from '@store/intentions/intentions.models';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IconComponent,
    AssetUrlPipe,
    PricePipe,
  ],
  template: `
    @if (searchService.isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-16 px-4 pb-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-[#050507]/65 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
          (click)="close()"
        ></div>

        <!-- Search Modal Card -->
        <div
          class="relative w-full max-w-2xl bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl shadow-[0_25px_60px_-15px_rgba(26,26,29,0.35)] overflow-hidden flex flex-col max-h-[82vh] z-10 animate-toast-in"
          (click)="$event.stopPropagation()"
        >
          <!-- Top Input Bar -->
          <div class="p-4 sm:p-5 border-b border-[#E2DDD2] flex items-center gap-3 bg-[#F4F1EA]/60">
            <app-icon name="search" [size]="20" customClass="text-[#10523C] shrink-0" />

            <input
              #searchInput
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="onQueryChange($event)"
              (keydown.enter)="onViewAll()"
              (keydown.escape)="close()"
              placeholder="{{ 'NAVBAR.SEARCH' | translate }}..."
              class="w-full bg-transparent text-sm sm:text-base text-[#1A1A1D] placeholder-[#8D8A81] focus:outline-none font-body font-normal"
              autocomplete="off"
              spellcheck="false"
            />

            @if (searchQuery().length > 0) {
              <button
                type="button"
                (click)="clearQuery()"
                class="text-[#8D8A81] hover:text-[#1A1A1D] p-1.5 rounded-full hover:bg-[#E2DDD2]/60 transition-colors cursor-pointer"
                aria-label="Clear query"
              >
                <app-icon name="close" [size]="14" />
              </button>
            }

            <span class="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest text-[#8D8A81] bg-[#E2DDD2]/60 px-2 py-0.5 rounded border border-[#E2DDD2]">
              ESC
            </span>

            <button
              type="button"
              (click)="close()"
              class="p-1.5 text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#E2DDD2]/60 rounded-full transition-colors cursor-pointer"
              aria-label="Close search"
            >
              <app-icon name="close" [size]="18" />
            </button>
          </div>

          <!-- Body Content -->
          <div class="overflow-y-auto p-4 sm:p-6 space-y-6 max-h-[60vh]">
            <!-- Loading Skeleton -->
            @if (loading()) {
              <div class="space-y-3">
                @for (i of [1, 2, 3]; track i) {
                  <div class="flex items-center gap-3.5 p-2.5 rounded-xl border border-[#E2DDD2]/60 animate-pulse bg-[#F4F1EA]/40">
                    <div class="w-14 h-14 rounded-lg bg-[#E2DDD2] shrink-0"></div>
                    <div class="space-y-2 flex-1">
                      <div class="w-1/4 h-2.5 bg-[#E2DDD2] rounded"></div>
                      <div class="w-3/5 h-3.5 bg-[#E2DDD2] rounded"></div>
                      <div class="w-1/5 h-2.5 bg-[#E2DDD2] rounded"></div>
                    </div>
                  </div>
                }
              </div>
            } @else if (searchQuery().trim().length > 0) {
              <!-- Search Results -->
              @if (results().length > 0) {
                <div class="space-y-3">
                  <div class="flex items-center justify-between px-1">
                    <span class="text-[10.5px] uppercase tracking-[0.18em] font-semibold text-[#8A7029]">
                      {{ results().length }} {{ 'SHOP.TITLE' | translate }}
                    </span>
                    <button
                      type="button"
                      (click)="onViewAll()"
                      class="text-xs text-[#10523C] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>{{ 'HOME.FEATURED_CATEGORIES.VIEW_ALL' | translate }}</span>
                      <app-icon name="arrow-right" [size]="12" />
                    </button>
                  </div>

                  <div class="space-y-2">
                    @for (product of results(); track product.id) {
                      <div
                        (click)="navigateToProduct(product.slug?.value || product.id)"
                        class="group flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-[#E2DDD2] bg-[#FCFBF9] hover:bg-[#F4F1EA] hover:border-[#10523C]/40 transition-all duration-200 cursor-pointer shadow-2xs"
                      >
                        <div class="flex items-center gap-3.5 min-w-0">
                          <!-- Image Thumbnail -->
                          <div class="w-13 h-13 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-[#E2DDD2]/40 border border-[#E2DDD2] shrink-0 flex items-center justify-center">
                            @if (product.images?.[0]?.url; as imageUrl) {
                              <img
                                [src]="imageUrl | assetUrl"
                                [alt]="getProductName(product)"
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            } @else {
                              <app-icon name="sparkles" [size]="18" customClass="text-[#8D8A81]" />
                            }
                          </div>

                          <!-- Text details -->
                          <div class="min-w-0 pr-2">
                            <span class="block text-[9.5px] uppercase tracking-[0.18em] font-medium text-[#8A7029] truncate">
                              {{ getCategoryName(product) }}
                            </span>
                            <h4 class="text-xs sm:text-sm font-semibold text-[#1A1A1D] group-hover:text-[#10523C] transition-colors truncate font-body product-title">
                              {{ getProductName(product) }}
                            </h4>
                            <span class="block text-xs font-semibold text-[#1A1A1D] mt-0.5 font-body">
                              {{ product.pricing?.price?.amount | price }}
                            </span>
                          </div>
                        </div>

                        <!-- Right arrow -->
                        <div class="text-[#8D8A81] group-hover:text-[#10523C] group-hover:translate-x-0.5 transition-all p-1">
                          <app-icon name="arrow-right" [size]="16" />
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <!-- No Results Empty State with helpful tips -->
                <div class="py-8 px-4 text-center space-y-3">
                  <div class="w-12 h-12 rounded-full bg-[#10523C]/10 border border-[#10523C]/20 text-[#10523C] flex items-center justify-center mx-auto shadow-2xs">
                    <app-icon name="search" [size]="20" />
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-sm font-semibold text-[#1A1A1D]">
                      {{ 'SEARCH.EMPTY_TITLE' | translate }}
                    </h3>
                    <p class="text-xs text-[#5F5D56] max-w-sm mx-auto leading-relaxed font-body">
                      {{ 'SEARCH.EMPTY_DESC' | translate }}
                    </p>
                  </div>

                  <!-- Quick suggestions -->
                  <div class="pt-2 flex flex-wrap justify-center gap-1.5">
                    @for (suggestion of popularSuggestions; track suggestion) {
                      <button
                        type="button"
                        (click)="onQueryChange(suggestion)"
                        class="px-2.5 py-1 rounded-full border border-[#E2DDD2] bg-[#FCFBF9] hover:border-[#10523C] text-[11px] text-[#5F5D56] hover:text-[#10523C] transition-colors cursor-pointer font-body"
                      >
                        {{ suggestion }}
                      </button>
                    }
                  </div>

                  <button
                    type="button"
                    (click)="navigateToShop()"
                    class="inline-flex items-center gap-1.5 btn-secondary text-xs py-2 px-4 cursor-pointer mt-3 font-body"
                  >
                    <span>{{ 'SEARCH.EMPTY_ACTION' | translate }}</span>
                    <app-icon name="arrow-right" [size]="12" />
                  </button>
                </div>
              }
            } @else {
              <!-- Discover Section (Before Typing) -->
              <div class="space-y-5">
                <!-- Intentions Tags -->
                @if (intentions().length > 0) {
                  <div class="space-y-2.5">
                    <h4 class="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#8A7029]">
                      {{ 'NAVBAR.INTENTIONS' | translate }}
                    </h4>
                    <div class="flex flex-wrap gap-2">
                      @for (intent of intentions(); track intent.id) {
                        <button
                          type="button"
                          (click)="selectIntention(intent.id)"
                          class="px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-[#FCFBF9] hover:border-[#10523C] hover:text-[#10523C] text-xs font-medium text-[#1A1A1D] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 flex items-center gap-1.5 font-body"
                        >
                          <app-icon name="sparkles" [size]="12" customClass="text-[#8A7029]" />
                          <span>{{ getIntentionItemName(intent) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Categories Tags -->
                @if (categories().length > 0) {
                  <div class="space-y-2.5 pt-2 border-t border-[#E2DDD2]/60">
                    <h4 class="text-[10.5px] uppercase tracking-[0.2em] font-semibold text-[#8A7029]">
                      {{ 'SHOP.FILTERS.CATEGORIES' | translate }}
                    </h4>
                    <div class="flex flex-wrap gap-2">
                      @for (category of categories(); track category.id) {
                        <button
                          type="button"
                          (click)="selectCategory(category.id)"
                          class="px-3 py-1.5 rounded-lg border border-[#E2DDD2] bg-[#FCFBF9] hover:border-[#10523C] hover:text-[#10523C] text-xs font-medium text-[#1A1A1D] transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 font-body"
                        >
                          {{ getCategoryItemName(category) }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Bottom Footer -->
          @if (searchQuery().trim().length > 0 && results().length > 0) {
            <div class="p-3 sm:p-4 border-t border-[#E2DDD2] bg-[#F4F1EA] flex items-center justify-between">
              <span class="text-xs text-[#5F5D56] font-body">
                <kbd class="font-mono text-[10px] bg-[#E2DDD2] px-1.5 py-0.5 rounded border border-[#D0C9BA]">ENTER</kbd>
              </span>
              <button
                type="button"
                (click)="onViewAll()"
                class="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer font-body"
              >
                <span>{{ 'HOME.FEATURED_CATEGORIES.VIEW_ALL' | translate }}</span>
                <app-icon name="arrow-right" [size]="13" />
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class SearchModalComponent implements OnInit, OnDestroy {
  public readonly searchService = inject(SearchModalService);
  public readonly localeService = inject(LocaleService);
  private readonly productsService = inject(ProductsService);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  @ViewChild('searchInput') private searchInputRef?: ElementRef<HTMLInputElement>;

  public readonly searchQuery = signal('');
  public readonly loading = signal(false);
  public readonly results = signal<ProductListItem[]>([]);

  public readonly categories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly intentions = this.store.selectSignal(IntentionsSelectors.intentions);

  public readonly popularSuggestions = ['Candles', 'Elixirs', 'Tarot', 'Protection', 'Incense', 'Love'];

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor() {
    // Focus search input whenever modal opens
    effect(() => {
      if (this.searchService.isOpen()) {
        setTimeout(() => {
          this.searchInputRef?.nativeElement.focus();
        }, 80);
      } else {
        this.clearQuery();
      }
    });
  }

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    if (this.searchService.isOpen()) {
      this.close();
    }
  }

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) {
            this.loading.set(false);
            return of({ items: [], totalCount: 0 });
          }

          this.loading.set(true);
          return this.productsService
            .getProducts({
              where: buildProductSearchFilter(trimmed),
              take: 8,
            })
            .pipe(
              catchError(() => of({ items: [], totalCount: 0 })),
            );
        }),
      )
      .subscribe((res) => {
        const ranked = rankSearchResults(res.items, this.searchQuery());
        this.results.set(ranked);
        this.loading.set(false);
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  public getProductName(product: ProductListItem): string {
    return getLocalizedName(product.translations, this.localeService.active(), 'Product');
  }

  public getCategoryName(product: ProductListItem): string {
    return getLocalizedName(product.category?.translations, this.localeService.active(), 'Ritual Object');
  }

  public getCategoryItemName(cat: CategoryItem): string {
    return getLocalizedName(cat.translations, this.localeService.active(), 'Category');
  }

  public getIntentionItemName(intent: IntentionItem): string {
    return getLocalizedName(intent.translations, this.localeService.active(), 'Intention');
  }

  public onQueryChange(val: string): void {
    this.searchQuery.set(val);
    this.searchSubject.next(val);
  }

  public clearQuery(): void {
    this.searchQuery.set('');
    this.results.set([]);
    this.loading.set(false);
  }

  public close(): void {
    this.searchService.close();
  }

  public onViewAll(): void {
    const q = this.searchQuery().trim();
    this.close();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { q } });
    } else {
      this.router.navigate(['/shop']);
    }
  }

  public navigateToProduct(slug?: string | null): void {
    if (!slug) return;
    this.close();
    this.router.navigate(['/product', slug]);
  }

  public navigateToShop(): void {
    this.close();
    this.router.navigate(['/shop']);
  }

  public selectIntention(intentionId: string): void {
    this.close();
    this.router.navigate(['/shop'], { queryParams: { intentionId } });
  }

  public selectCategory(categoryId: string): void {
    this.close();
    this.router.navigate(['/shop'], { queryParams: { categoryId } });
  }
}
