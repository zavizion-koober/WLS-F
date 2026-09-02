import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName } from '@core/utils/translation.utils';
import { ProductsSelectors } from '@store/products/products.selectors';
import { AddToCart } from '@store/cart/cart.actions';
import { ProductListItem } from '@store/products/products.models';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { ProductStatus } from 'src/generated/graphql';

const SAMPLE_FALLBACK_PRODUCTS: ProductListItem[] = [
  {
    id: 'demo-1',
    status: ProductStatus.Published,
    slug: { value: 'lunar-cleansing-elixir' },
    pricing: { price: { amount: 85 } },
    images: [{ id: 'img-1', url: '/images/witchlab_hero.png', altText: 'Lunar Cleansing Elixir', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Lunar Cleansing Elixir', shortDescription: 'Botanical ceremonial oil' },
      { language: 'ka', name: 'მთვარის გამწმენდი ელექსირი', shortDescription: 'ბოტანიკური საცხებელი ზეთი' },
      { language: 'ru', name: 'Лунный очищающий эликсир', shortDescription: 'Ботаническое ритуальное масло' },
    ],
    category: {
      id: 'cat-1',
      translations: [
        { language: 'en', name: 'Ceremonial Oils' },
        { language: 'ka', name: 'რიტუალური ზეთები' },
        { language: 'ru', name: 'Ритуальные масла' },
      ],
    },
    intention: {
      id: 'int-1',
      translations: [
        { language: 'en', name: 'Purification' },
        { language: 'ka', name: 'განწმენდა' },
        { language: 'ru', name: 'Очищение' },
      ],
    },
  },
  {
    id: 'demo-2',
    status: ProductStatus.Published,
    slug: { value: 'obsidian-protection-candle' },
    pricing: { price: { amount: 120 } },
    images: [{ id: 'img-2', url: '/images/witchlab_hero.png', altText: 'Obsidian Protection Candle', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Obsidian Protection Candle', shortDescription: 'Hand-poured soy candle with raw obsidian' },
      { language: 'ka', name: 'ობსიდიანის დამცავი სანთელი', shortDescription: 'სოიოს სანთელი ნატურალური ობსიდიანით' },
      { language: 'ru', name: 'Свеча защиты с обсидианом', shortDescription: 'Соевая свеча с натуральным обсидианом' },
    ],
    category: {
      id: 'cat-2',
      translations: [
        { language: 'en', name: 'Soy Candles' },
        { language: 'ka', name: 'სოიოს სანთლები' },
        { language: 'ru', name: 'Соевые свечи' },
      ],
    },
    intention: {
      id: 'int-2',
      translations: [
        { language: 'en', name: 'Protection' },
        { language: 'ka', name: 'დაცვა' },
        { language: 'ru', name: 'Защита' },
      ],
    },
  },
  {
    id: 'demo-3',
    status: ProductStatus.Published,
    slug: { value: 'solar-abundance-talisman' },
    pricing: { price: { amount: 165 }, salePrice: { amount: 145 } },
    images: [{ id: 'img-3', url: '/images/witchlab_hero.png', altText: 'Solar Abundance Talisman', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Solar Abundance Talisman', shortDescription: 'Hand-forged brass and citrine amulet' },
      { language: 'ka', name: 'მზის სიუხვის თილისმა', shortDescription: 'ხელით ნაკეთი თითბერისა და ციტრინის ამულეტი' },
      { language: 'ru', name: 'Талисман солнечного изобилия', shortDescription: 'Латунный амулет с цитрином' },
    ],
    category: {
      id: 'cat-3',
      translations: [
        { language: 'en', name: 'Talismans' },
        { language: 'ka', name: 'თილისმები' },
        { language: 'ru', name: 'Талисманы' },
      ],
    },
    intention: {
      id: 'int-3',
      translations: [
        { language: 'en', name: 'Abundance' },
        { language: 'ka', name: 'სიუხვე' },
        { language: 'ru', name: 'Изобилие' },
      ],
    },
  },
  {
    id: 'demo-4',
    status: ProductStatus.Published,
    slug: { value: 'rose-quartz-harmony-sphere' },
    pricing: { price: { amount: 95 } },
    images: [{ id: 'img-4', url: '/images/witchlab_hero.png', altText: 'Rose Quartz Harmony Sphere', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Rose Quartz Harmony Sphere', shortDescription: 'Natural polished crystal sphere' },
      { language: 'ka', name: 'ვარდისფერი კვარცის სფერო', shortDescription: 'ნატურალური დამუშავებული კრისტალი' },
      { language: 'ru', name: 'Сфера из розового кварца', shortDescription: 'Полированная сфера из кварца' },
    ],
    category: {
      id: 'cat-4',
      translations: [
        { language: 'en', name: 'Raw Crystals' },
        { language: 'ka', name: 'კრისტალები' },
        { language: 'ru', name: 'Кристаллы' },
      ],
    },
    intention: {
      id: 'int-4',
      translations: [
        { language: 'en', name: 'Love & Harmony' },
        { language: 'ka', name: 'სიყვარული და ჰარმონია' },
        { language: 'ru', name: 'Любовь и гармония' },
      ],
    },
  },
  {
    id: 'demo-5',
    status: ProductStatus.Published,
    slug: { value: 'astral-dream-incense-blend' },
    pricing: { price: { amount: 55 } },
    images: [{ id: 'img-5', url: '/images/witchlab_hero.png', altText: 'Astral Dream Incense', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Astral Dream Incense Blend', shortDescription: 'Botanical resins and sacred mugwort' },
      { language: 'ka', name: 'ასტრალური სიზმრის საკმეველი', shortDescription: 'ბოტანიკური ფისები და წმინდა მცენარეები' },
      { language: 'ru', name: 'Благовония астральных снов', shortDescription: 'Ботанические смолы и полынь' },
    ],
    category: {
      id: 'cat-5',
      translations: [
        { language: 'en', name: 'Incense & Smoke' },
        { language: 'ka', name: 'საკმეველი' },
        { language: 'ru', name: 'Благовония' },
      ],
    },
    intention: {
      id: 'int-5',
      translations: [
        { language: 'en', name: 'Intuition' },
        { language: 'ka', name: 'ინტუიცია' },
        { language: 'ru', name: 'Интуиция' },
      ],
    },
  },
  {
    id: 'demo-6',
    status: ProductStatus.Published,
    slug: { value: 'pyrite-wealth-altar-stone' },
    pricing: { price: { amount: 110 } },
    images: [{ id: 'img-6', url: '/images/witchlab_hero.png', altText: 'Pyrite Altar Stone', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Pyrite Wealth Altar Stone', shortDescription: 'Cluster crystal for prosperity' },
      { language: 'ka', name: 'პირიტის სიმდიდრის ქვა', shortDescription: 'კრისტალური კლასტერი ბარაქისთვის' },
      { language: 'ru', name: 'Пиритовый алтарный камень', shortDescription: 'Кристалл пирита для процветания' },
    ],
    category: {
      id: 'cat-4',
      translations: [
        { language: 'en', name: 'Raw Crystals' },
        { language: 'ka', name: 'კრისტალები' },
        { language: 'ru', name: 'Кристаллы' },
      ],
    },
    intention: {
      id: 'int-3',
      translations: [
        { language: 'en', name: 'Abundance' },
        { language: 'ka', name: 'სიუხვე' },
        { language: 'ru', name: 'Изобилие' },
      ],
    },
  },
  {
    id: 'demo-7',
    status: ProductStatus.Published,
    slug: { value: 'amethyst-tranquility-candle' },
    pricing: { price: { amount: 125 } },
    images: [{ id: 'img-7', url: '/images/witchlab_hero.png', altText: 'Amethyst Candle', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Amethyst Tranquility Candle', shortDescription: 'Lavender and raw amethyst ritual candle' },
      { language: 'ka', name: 'ამეთვისტოს სიმშვიდის სანთელი', shortDescription: 'ლავანდისა და ამეთვისტოს სოიოს სანთელი' },
      { language: 'ru', name: 'Свеча спокойствия с аметистом', shortDescription: 'Свеча с лавандой и аметистом' },
    ],
    category: {
      id: 'cat-2',
      translations: [
        { language: 'en', name: 'Soy Candles' },
        { language: 'ka', name: 'სოიოს სანთლები' },
        { language: 'ru', name: 'Соевые свечи' },
      ],
    },
    intention: {
      id: 'int-1',
      translations: [
        { language: 'en', name: 'Peace' },
        { language: 'ka', name: 'სიმშვიდე' },
        { language: 'ru', name: 'Покой' },
      ],
    },
  },
  {
    id: 'demo-8',
    status: ProductStatus.Published,
    slug: { value: 'sacred-myrrh-anointing-oil' },
    pricing: { price: { amount: 90 } },
    images: [{ id: 'img-8', url: '/images/witchlab_hero.png', altText: 'Myrrh Oil', isPrimary: true }],
    translations: [
      { language: 'en', name: 'Sacred Myrrh Anointing Oil', shortDescription: 'Ancient resin ritual potion' },
      { language: 'ka', name: 'მურის წმინდა საცხებელი ზეთი', shortDescription: 'უძველესი ფისოვანი ელექსირი' },
      { language: 'ru', name: 'Мирровое ритуальное масло', shortDescription: 'Священное масло мирры' },
    ],
    category: {
      id: 'cat-1',
      translations: [
        { language: 'en', name: 'Ceremonial Oils' },
        { language: 'ka', name: 'რიტუალური ზეთები' },
        { language: 'ru', name: 'Ритуальные масла' },
      ],
    },
    intention: {
      id: 'int-2',
      translations: [
        { language: 'en', name: 'Protection' },
        { language: 'ka', name: 'დაცვა' },
        { language: 'ru', name: 'Защита' },
      ],
    },
  },
];

@Component({
  selector: 'app-popular-products-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    PricePipe,
    AssetUrlPipe,
    IconComponent,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="atelier-container py-10 sm:py-14 lg:py-16" aria-labelledby="popular-heading">
      <!-- Centered Editorial Heading -->
      <div class="text-center mb-8 sm:mb-10">
        <span class="text-eyebrow text-[#8A7029] block mb-1.5">
          {{ 'HOME.POPULAR.SUBTITLE' | translate }}
        </span>
        <h2
          id="popular-heading"
          class="font-display text-section-title font-bold text-[#1A1A1D] tracking-tight"
        >
          {{ 'HOME.POPULAR.TITLE' | translate }}
        </h2>
      </div>

      @if (loading() && products().length === 0) {
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          @for (i of [1, 2, 3, 4]; track i) {
            <app-loading-skeleton height="420px" customClass="rounded-sm" />
          }
        </div>
      } @else if (products().length > 0) {
        <!-- Products Carousel / Track -->
        <div class="relative group/carousel">
          <div
            #carouselTrack
            (scroll)="onScroll()"
            class="flex items-stretch gap-4 sm:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-2"
          >
            @for (prod of products(); track prod.id; let idx = $index) {
              <article
                class="snap-start shrink-0 w-[calc(82%-8px)] xs:w-[calc(60%-12px)] sm:w-[calc(45%-16px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] flex flex-col justify-between select-none"
              >
                <!-- Card Inner -->
                <div class="flex flex-col h-full">
                  <!-- Product Image Stage (Square 1:1 Aspect Ratio) -->
                  <div
                    class="relative w-full aspect-square bg-[#F5F2EB] overflow-hidden rounded-xs group/card"
                  >
                    <a
                      [routerLink]="['/product', productSlug(prod)]"
                      class="block w-full h-full cursor-pointer overflow-hidden"
                    >
                      <img
                        [src]="getProductImage(prod) | assetUrl"
                        [alt]="getProductName(prod)"
                        loading="lazy"
                        class="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover/card:scale-105"
                      />
                    </a>

                    <!-- Wishlist Heart Button -->
                    <button
                      type="button"
                      (click)="toggleWishlist(prod.id, $event)"
                      [attr.aria-label]="'Wishlist ' + getProductName(prod)"
                      class="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#1A1A1D] flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs hover:scale-110 active:scale-95"
                    >
                      @if (isWishlisted(prod.id)) {
                        <span class="text-[#8A7029] text-base leading-none">♥</span>
                      } @else {
                        <span class="text-[#1A1A1D]/70 hover:text-[#1A1A1D] text-sm leading-none">♡</span>
                      }
                    </button>
                  </div>

                  <!-- Product Metadata -->
                  <div class="pt-3.5 pb-2 flex flex-col flex-1">
                    <h3 class="font-display text-lg sm:text-xl font-normal text-[#1A1A1D] leading-snug truncate">
                      <a
                        [routerLink]="['/product', productSlug(prod)]"
                        class="hover:text-[#10523C] transition-colors"
                      >
                        {{ getProductName(prod) }}
                      </a>
                    </h3>

                    <p class="text-xs text-[#8D8A81] uppercase tracking-wider mt-1 truncate">
                      {{ getCategoryOrIntention(prod) }}
                    </p>

                    <div class="mt-2 text-sm sm:text-base font-semibold text-[#1A1A1D]">
                      @if (hasSalePrice(prod)) {
                        <span class="text-[#10523C] font-semibold">
                          {{ prod.pricing?.salePrice?.amount | price }}
                        </span>
                        <span class="text-xs text-[#8D8A81] line-through ml-1.5 font-normal">
                          {{ prod.pricing?.price?.amount | price }}
                        </span>
                      } @else {
                        <span>{{ prod.pricing?.price?.amount | price }}</span>
                      }
                    </div>
                  </div>

                  <!-- Full Width ADD TO CART Button -->
                  <button
                    type="button"
                    (click)="onAddToCart(prod, $event)"
                    [disabled]="isOutOfStock(prod)"
                    [class.bg-[#0D2B1D]]="justAddedIds().has(prod.id)"
                    class="w-full bg-[#10523C] hover:bg-[#0A1A12] disabled:bg-[#8D8A81]/50 text-[#FCFBF9] py-3.5 px-4 text-xs font-semibold uppercase tracking-widest text-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed rounded-xs flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99] mt-2"
                  >
                    @if (justAddedIds().has(prod.id)) {
                      <app-icon name="check" [size]="14" customClass="text-[#CBB26A]" />
                      <span class="text-[#CBB26A]">{{ 'HOME.POPULAR.ADDED' | translate }}</span>
                    } @else if (isOutOfStock(prod)) {
                      <span>{{ 'PRODUCT.OUT_OF_STOCK' | translate }}</span>
                    } @else {
                      <span>{{ 'HOME.POPULAR.ADD_TO_CART' | translate }}</span>
                    }
                  </button>
                </div>
              </article>
            }
          </div>

          <!-- Bottom Navigation & Dash Pagination -->
          <div class="mt-6 sm:mt-8 flex items-center justify-between gap-4">
            <!-- Prev Long Arrow Button (No Background) -->
            <button
              type="button"
              (click)="scrollPrev()"
              aria-label="Previous items"
              class="group flex items-center justify-center py-2 px-1 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            >
              <svg
                class="w-7 sm:w-9 h-4 transition-transform duration-200 group-hover:-translate-x-1.5"
                viewBox="0 0 36 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="34" y1="8" x2="2" y2="8"></line>
                <polyline points="9 2 2 8 9 14"></polyline>
              </svg>
            </button>

            <!-- Dash Indicators -->
            <div class="flex items-center gap-1.5 sm:gap-2">
              @for (dash of indicators(); track $index; let idx = $index) {
                <button
                  type="button"
                  (click)="scrollToIndex(idx)"
                  [class.w-7]="activeIndicator() === idx"
                  [class.bg-[#1A1A1D]]="activeIndicator() === idx"
                  [class.opacity-100]="activeIndicator() === idx"
                  [class.w-4]="activeIndicator() !== idx"
                  [class.bg-[#D8D2C4]]="activeIndicator() !== idx"
                  [class.opacity-70]="activeIndicator() !== idx"
                  class="h-[1.5px] rounded-none transition-all duration-300 cursor-pointer hover:bg-[#1A1A1D] hover:opacity-100"
                  [attr.aria-label]="'Go to page ' + (idx + 1)"
                ></button>
              }
            </div>

            <!-- Next Long Arrow Button (No Background) -->
            <button
              type="button"
              (click)="scrollNext()"
              aria-label="Next items"
              class="group flex items-center justify-center py-2 px-1 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            >
              <svg
                class="w-7 sm:w-9 h-4 transition-transform duration-200 group-hover:translate-x-1.5"
                viewBox="0 0 36 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="2" y1="8" x2="34" y2="8"></line>
                <polyline points="27 2 34 8 27 14"></polyline>
              </svg>
            </button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `,
})
export class PopularProductsSectionComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  public readonly localeService = inject(LocaleService);

  @ViewChild('carouselTrack') private carouselTrack?: ElementRef<HTMLDivElement>;

  public readonly bestSellers = this.store.selectSignal(ProductsSelectors.bestSellers);
  public readonly allStoreProducts = this.store.selectSignal(ProductsSelectors.products);
  public readonly loading = this.store.selectSignal(ProductsSelectors.bestSellersLoading);

  public readonly products = computed<ProductListItem[]>(() => {
    const list: ProductListItem[] = [];
    const seen = new Set<string>();

    const bs = this.bestSellers();
    if (bs && bs.length > 0) {
      for (const item of bs) {
        if (!seen.has(item.product.id)) {
          seen.add(item.product.id);
          list.push(item.product);
        }
      }
    }

    const all = this.allStoreProducts();
    if (all && all.length > 0) {
      for (const p of all) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    }

    // If total items from backend is small (e.g. initial dev environment), append fallback samples
    if (list.length < 8) {
      for (const p of SAMPLE_FALLBACK_PRODUCTS) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }
    }

    return list;
  });

  public readonly wishlistedIds = signal<Set<string>>(new Set());
  public readonly justAddedIds = signal<Set<string>>(new Set());
  public readonly activeIndicator = signal(0);

  public readonly indicators = computed(() => {
    const total = this.products().length;
    if (total <= 0) return [];
    const count = Math.max(1, Math.ceil(total / 2));
    return Array.from({ length: Math.min(count, 8) });
  });

  public productSlug(prod: ProductListItem): string {
    return prod.slug?.value || prod.id;
  }

  public getProductName(prod: ProductListItem): string {
    return getLocalizedName(prod.translations, this.localeService.active(), 'Ritual Object');
  }

  public getCategoryOrIntention(prod: ProductListItem): string {
    const cat = getLocalizedName(prod.category?.translations, this.localeService.active(), '');
    const intent = getLocalizedName(prod.intention?.translations, this.localeService.active(), '');
    if (cat && intent) return `${cat} • ${intent}`;
    if (cat) return cat;
    if (intent) return intent;
    return 'Atelier Edition';
  }

  public getProductImage(prod: ProductListItem): string {
    const images = prod.images;
    if (!images || images.length === 0) return '/images/witchlab_hero.png';
    const primary = images.find((i: any) => i?.isPrimary);
    return primary ? primary.url : images[0]?.url || '/images/witchlab_hero.png';
  }

  public hasSalePrice(prod: ProductListItem): boolean {
    const sale = prod.pricing?.salePrice?.amount;
    return sale !== undefined && sale !== null && Number(sale) > 0;
  }

  public isOutOfStock(prod: ProductListItem): boolean {
    const qty = prod.inventory?.stockQuantity;
    return qty !== undefined && qty !== null && qty <= 0;
  }

  public toggleWishlist(id: string, event: Event): void {
    event.stopPropagation();
    this.wishlistedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  public isWishlisted(id: string): boolean {
    return this.wishlistedIds().has(id);
  }

  public onAddToCart(prod: ProductListItem, event: Event): void {
    event.stopPropagation();
    if (this.isOutOfStock(prod)) return;

    this.justAddedIds.update((set) => {
      const next = new Set(set);
      next.add(prod.id);
      return next;
    });

    setTimeout(() => {
      this.justAddedIds.update((set) => {
        const next = new Set(set);
        next.delete(prod.id);
        return next;
      });
    }, 1500);

    this.store.dispatch(new AddToCart(prod.id, 1, true));
  }

  public onScroll(): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      this.activeIndicator.set(0);
      return;
    }
    const ratio = Math.max(0, Math.min(1, el.scrollLeft / maxScroll));
    const total = this.indicators().length;
    const idx = Math.min(total - 1, Math.round(ratio * (total - 1)));
    this.activeIndicator.set(idx);
  }

  public scrollPrev(): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // If at the beginning, cycle to the end
    if (el.scrollLeft <= 15) {
      el.scrollTo({ left: maxScroll, behavior: 'smooth' });
    } else {
      const step = el.clientWidth * 0.75;
      const target = Math.max(0, el.scrollLeft - step);
      el.scrollTo({ left: target, behavior: 'smooth' });
    }
  }

  public scrollNext(): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // If at the end, cycle back to the beginning
    if (el.scrollLeft >= maxScroll - 15) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      const step = el.clientWidth * 0.75;
      const target = Math.min(maxScroll, el.scrollLeft + step);
      el.scrollTo({ left: target, behavior: 'smooth' });
    }
  }

  public scrollToIndex(idx: number): void {
    const el = this.carouselTrack?.nativeElement;
    if (!el) return;
    const total = this.indicators().length;
    if (total <= 1) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = (idx / (total - 1)) * maxScroll;
    el.scrollTo({ left: target, behavior: 'smooth' });
  }
}
