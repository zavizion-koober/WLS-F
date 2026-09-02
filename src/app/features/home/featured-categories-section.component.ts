import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName, getLocalizedDescription } from '@core/utils/translation.utils';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { CategoryItem } from '@store/categories/categories.models';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { CategoryStatus, CategoryType } from 'src/generated/graphql';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const DEFAULT_FALLBACK_CATEGORIES: CategoryItem[] = [
  {
    id: 'candles',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/candles_category.png',
    translations: [
      {
        language: 'en',
        name: 'Soy Candles',
        description: 'Hand-poured botanicals charged with raw crystal chips under waxing moons',
      },
      {
        language: 'ka',
        name: 'სარიტუალო სანთლები',
        description: 'ხელით ჩამოსხმული ბოტანიკური სანთლები ნატურალური კრისტალებით',
      },
      {
        language: 'ru',
        name: 'Ритуальные свечи',
        description: 'Свечи ручной работы с ботаническими эссенциями и кристаллами',
      },
    ],
  },
  {
    id: 'crystals',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/bundles_category.png',
    translations: [
      {
        language: 'en',
        name: 'Crystals & Minerals',
        description: 'Ethically sourced geological treasures attuned to elemental frequencies',
      },
      {
        language: 'ka',
        name: 'კრისტალები და მინერალები',
        description: 'ნატურალური მინერალები და ენერგეტიკული კრისტალები',
      },
      {
        language: 'ru',
        name: 'Кристаллы и минералы',
        description: 'Натуральные минералы и энергетические кристаллы',
      },
    ],
  },
  {
    id: 'tarot',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/talismans_category.png',
    translations: [
      {
        language: 'en',
        name: 'Tarot & Oracle',
        description: 'Sacred archetypal decks for divination and subconscious mapping',
      },
      {
        language: 'ka',
        name: 'ტაროს და ორაკულის ბანქო',
        description: 'საავტორო და კლასიკური დასტები გაცნობიერებული ხედვისთვის',
      },
      {
        language: 'ru',
        name: 'Таро и оракулы',
        description: 'Сакральные колоды для интуитивного прорицания',
      },
    ],
  },
  {
    id: 'incense',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/witchlab_hero.png',
    translations: [
      {
        language: 'en',
        name: 'Incense & Smudge Herbs',
        description: 'Botanical resins and sacred smoke blends for atmospheric purification',
      },
      {
        language: 'ka',
        name: 'საკმეველი და ბალახები',
        description: 'სივრცის გასაწმენდი ბოტანიკური საკმეველი და საკმეველი მცენარეები',
      },
      {
        language: 'ru',
        name: 'Благовония и травы',
        description: 'Очищающие смолы и священные травы для пространства',
      },
    ],
  },
  {
    id: 'altar',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/bracelets_category.png',
    translations: [
      {
        language: 'en',
        name: 'Altar & Sacred Tools',
        description: 'Chalices, forged brass objects, and sacred ritual centerpieces',
      },
      {
        language: 'ka',
        name: 'საკურთხევლის ატრიბუტები',
        description: 'თასები, საკურთხევლის ჭურჭელი და წმინდა რიტუალური იარაღები',
      },
      {
        language: 'ru',
        name: 'Алтарные атрибуты',
        description: 'Чаши, ритуальные принадлежности и сакральные инструменты',
      },
    ],
  },
  {
    id: 'oils',
    status: CategoryStatus.Published,
    type: CategoryType.Category,
    imageUrl: '/images/oils_category.png',
    translations: [
      {
        language: 'en',
        name: 'Oils & Ceremonial Elixirs',
        description: 'Cold-pressed botanical potions crafted according to planetary hours',
      },
      {
        language: 'ka',
        name: 'ზეთები და ელექსირები',
        description: 'ეთერზეთები, საცხები და პლანეტარული რიტუალური ელექსირები',
      },
      {
        language: 'ru',
        name: 'Масла и эликсиры',
        description: 'Эфирные масла, помазания и ритуальные эликсиры',
      },
    ],
  },
];

@Component({
  selector: 'app-featured-categories-section',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    AssetUrlPipe,
    LoadingSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="atelier-container py-10 sm:py-14 lg:py-16" aria-labelledby="atelier-directory-heading">
      <!-- 1. Art-Directed Section Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 pb-4 sm:pb-5 border-b border-[#E2DDD2] gap-4">
        <div class="space-y-1.5">
          <span class="text-eyebrow text-[#8A7029]">
            {{ 'HOME.FEATURED_CATEGORIES.SUBTITLE' | translate }}
          </span>
          <h2
            id="atelier-directory-heading"
            class="font-display text-section-title font-bold text-[#1A1A1D] tracking-tight"
          >
            {{ 'HOME.FEATURED_CATEGORIES.TITLE' | translate }}
          </h2>
        </div>

        <div class="flex items-center gap-6">
          <p class="text-xs sm:text-sm text-[#5F5D56] font-body font-light leading-relaxed max-w-sm hidden lg:block">
            {{ 'HOME.FEATURED_CATEGORIES.DESC' | translate }}
          </p>

          <a routerLink="/shop" class="btn-editorial-link shrink-0">
            {{ 'HOME.FEATURED_CATEGORIES.VIEW_ALL' | translate }}
          </a>
        </div>
      </div>

      <!-- 2. Loading State -->
      @if (loading() && categories().length === 0) {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-[540px]">
          <div class="lg:col-span-6 h-full">
            <app-loading-skeleton height="100%" customClass="rounded-2xl" />
          </div>
          <div class="lg:col-span-6 flex flex-col justify-between py-4 space-y-4">
            @for (i of [1, 2, 3, 4, 5, 6]; track i) {
              <app-loading-skeleton height="60px" customClass="rounded-lg" />
            }
          </div>
        </div>
      } @else if (categories().length > 0) {
        <!-- 3. Desktop & Tablet: Interactive Atelier Directory (Portal Stage + Synchronized Index) -->
        <div class="hidden md:grid grid-cols-12 gap-6 lg:gap-8 items-stretch min-h-[540px] lg:min-h-[580px]">
          
          <!-- LEFT: The Live Visual Portal Frame (50% width) -->
          <div class="col-span-6 flex flex-col">
            <div
              class="relative w-full h-[540px] lg:h-[580px] rounded-2xl overflow-hidden bg-[#0A1A12] border border-[#E2DDD2] shadow-2xl flex flex-col justify-between p-6 sm:p-8 select-none"
            >
              <!-- Cross-fading background photographs -->
              @for (cat of categories(); track cat.id; let idx = $index) {
                <div
                  class="absolute inset-0 transition-opacity duration-700 ease-out pointer-events-none"
                  [class.opacity-100]="activeCategoryIndex() === idx"
                  [class.opacity-0]="activeCategoryIndex() !== idx"
                  [class.z-0]="activeCategoryIndex() === idx"
                >
                  <img
                    [src]="getCategoryImageUrl(cat, idx) | assetUrl"
                    [alt]="getCategoryName(cat)"
                    loading="lazy"
                    class="w-full h-full object-cover object-center filter brightness-[0.92] scale-100 transition-transform duration-1000 ease-out"
                    [class.scale-105]="activeCategoryIndex() === idx"
                  />
                </div>
              }

              <!-- Atmospheric Vignette Layer -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-[#0A1A12]/95 via-[#0A1A12]/40 to-[#0A1A12]/20 pointer-events-none z-10"
              ></div>

              <!-- Top Badge -->
              <div class="relative z-20 flex items-center justify-between">
                <span
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A1A12]/75 backdrop-blur-md border border-[#CBB26A]/40 text-[10px] uppercase tracking-[0.25em] text-[#CBB26A] font-semibold"
                >
                  <span>✦</span>
                  <span>REALM 0{{ activeCategoryIndex() + 1 }} / 0{{ categories().length }}</span>
                </span>

                <span
                  class="w-8 h-8 rounded-full bg-[#0A1A12]/60 backdrop-blur-md border border-[#FCFBF9]/20 text-[#FCFBF9] flex items-center justify-center text-xs"
                >
                  ↗
                </span>
              </div>

              <!-- Bottom Information & Action Portal -->
              @if (currentActiveCategory(); as activeCat) {
                <div class="relative z-20 flex flex-col items-start space-y-3">
                  <span class="text-[10.5px] uppercase tracking-[0.22em] text-[#CBB26A] font-semibold">
                    {{ getRoman(activeCategoryIndex()) }} • Atelier Archive
                  </span>

                  <h3 class="font-display text-3xl lg:text-4xl font-normal text-[#FCFBF9] leading-tight">
                    {{ getCategoryName(activeCat) }}
                  </h3>

                  @if (getCategoryDesc(activeCat)) {
                    <p class="text-xs sm:text-sm text-[#F4F1EA]/85 font-light leading-relaxed max-w-md line-clamp-2">
                      {{ getCategoryDesc(activeCat) }}
                    </p>
                  }

                  <a
                    [routerLink]="['/shop']"
                    [queryParams]="getQueryParams(activeCat)"
                    class="btn-gold-accent mt-2 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold cursor-pointer shadow-lg active:scale-95 transition-all"
                  >
                    <span>{{ 'HOME.FEATURED_CATEGORIES.EXPLORE' | translate }}</span>
                    <span>→</span>
                  </a>
                </div>
              }
            </div>
          </div>

          <!-- RIGHT: The Interactive Typographic Index (50% width) -->
          <div class="col-span-6 flex flex-col justify-between py-1">
            <div class="divide-y divide-[#E2DDD2] flex flex-col h-full justify-between">
              @for (cat of categories(); track cat.id; let idx = $index) {
                <div
                  (mouseenter)="onHoverCategory(idx)"
                  (focus)="onHoverCategory(idx)"
                  (click)="onSelectCategory(cat)"
                  tabindex="0"
                  class="group py-4 lg:py-5 px-4 rounded-xl transition-all duration-300 cursor-pointer select-none flex items-center justify-between"
                  [class.bg-[#F5F2EB]]="activeCategoryIndex() === idx"
                  [class.border-l-4]="activeCategoryIndex() === idx"
                  [class.border-l-[#10523C]]="activeCategoryIndex() === idx"
                  [class.shadow-2xs]="activeCategoryIndex() === idx"
                >
                  <div class="flex items-center gap-4 lg:gap-6">
                    <!-- Roman Numeral -->
                    <span
                      class="text-xs lg:text-sm font-mono tracking-widest font-semibold transition-colors w-7"
                      [class.text-[#10523C]]="activeCategoryIndex() === idx"
                      [class.text-[#8D8A81]]="activeCategoryIndex() !== idx"
                    >
                      {{ getRoman(idx) }}.
                    </span>

                    <div>
                      <h4
                        class="font-display transition-colors leading-snug"
                        [class.text-2xl]="activeCategoryIndex() === idx"
                        [class.lg:text-3xl]="activeCategoryIndex() === idx"
                        [class.text-[#10523C]]="activeCategoryIndex() === idx"
                        [class.font-bold]="activeCategoryIndex() === idx"
                        [class.text-xl]="activeCategoryIndex() !== idx"
                        [class.lg:text-2xl]="activeCategoryIndex() !== idx"
                        [class.text-[#1A1A1D]/80]="activeCategoryIndex() !== idx"
                        [class.group-hover:text-[#10523C]]="activeCategoryIndex() !== idx"
                      >
                        {{ getCategoryName(cat) }}
                      </h4>

                      @if (activeCategoryIndex() === idx && getCategoryDesc(cat)) {
                        <p class="text-xs text-[#5F5D56] font-light leading-relaxed line-clamp-1 mt-0.5">
                          {{ getCategoryDesc(cat) }}
                        </p>
                      }
                    </div>
                  </div>

                  <!-- Interactive Arrow -->
                  <div
                    class="transition-all duration-300 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider"
                    [class.text-[#10523C]]="activeCategoryIndex() === idx"
                    [class.translate-x-0]="activeCategoryIndex() === idx"
                    [class.opacity-100]="activeCategoryIndex() === idx"
                    [class.text-[#8D8A81]]="activeCategoryIndex() !== idx"
                    [class.-translate-x-2]="activeCategoryIndex() !== idx"
                    [class.opacity-0]="activeCategoryIndex() !== idx"
                    [class.group-hover:opacity-100]="activeCategoryIndex() !== idx"
                    [class.group-hover:translate-x-0]="activeCategoryIndex() !== idx"
                  >
                    <span>{{ 'HOME.FEATURED_CATEGORIES.EXPLORE' | translate }}</span>
                    <span class="text-base leading-none">→</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- 4. Mobile: Interactive Realm Carousel with Segmented Navigation -->
        <div class="md:hidden space-y-4">
          <!-- Segmented Category Pill Tabs -->
          <div class="flex overflow-x-auto gap-2 pb-2 no-scrollbar -mx-4 px-4">
            @for (cat of categories(); track cat.id; let idx = $index) {
              <button
                type="button"
                (click)="onHoverCategory(idx)"
                class="shrink-0 px-4 py-2 rounded-full border text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-2xs"
                [class.bg-[#10523C]]="activeCategoryIndex() === idx"
                [class.text-[#FCFBF9]]="activeCategoryIndex() === idx"
                [class.border-[#10523C]]="activeCategoryIndex() === idx"
                [class.bg-[#FCFBF9]]="activeCategoryIndex() !== idx"
                [class.text-[#1A1A1D]]="activeCategoryIndex() !== idx"
                [class.border-[#E2DDD2]]="activeCategoryIndex() !== idx"
              >
                {{ getRoman(idx) }}. {{ getCategoryName(cat) }}
              </button>
            }
          </div>

          <!-- Active Mobile Portal Card -->
          @if (currentActiveCategory(); as activeCat) {
            <a
              [routerLink]="['/shop']"
              [queryParams]="getQueryParams(activeCat)"
              class="relative block w-full h-[440px] rounded-2xl overflow-hidden bg-[#0A1A12] border border-[#E2DDD2] shadow-xl p-6 select-none"
            >
              <img
                [src]="getCategoryImageUrl(activeCat, activeCategoryIndex()) | assetUrl"
                [alt]="getCategoryName(activeCat)"
                loading="lazy"
                class="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.92]"
              />

              <div class="absolute inset-0 bg-gradient-to-t from-[#0A1A12]/95 via-[#0A1A12]/45 to-[#0A1A12]/20 pointer-events-none"></div>

              <!-- Top Bar -->
              <div class="relative z-10 flex items-center justify-between">
                <span class="px-3 py-1 rounded-full bg-[#0A1A12]/70 text-[10px] uppercase tracking-[0.2em] text-[#CBB26A] border border-[#CBB26A]/30">
                  ✦ REALM 0{{ activeCategoryIndex() + 1 }}
                </span>
                <span class="w-7 h-7 rounded-full bg-[#0A1A12]/60 text-[#FCFBF9] flex items-center justify-center text-xs">
                  ↗
                </span>
              </div>

              <!-- Bottom Content -->
              <div class="absolute inset-x-0 bottom-0 p-6 z-10 space-y-2">
                <span class="text-[9.5px] uppercase tracking-[0.22em] text-[#CBB26A] font-semibold">
                  {{ getRoman(activeCategoryIndex()) }} • Atelier Collection
                </span>

                <h3 class="font-display text-2xl font-normal text-[#FCFBF9] leading-tight">
                  {{ getCategoryName(activeCat) }}
                </h3>

                @if (getCategoryDesc(activeCat)) {
                  <p class="text-xs text-[#F4F1EA]/80 font-light leading-relaxed line-clamp-2">
                    {{ getCategoryDesc(activeCat) }}
                  </p>
                }

                <div class="pt-2 flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-[#CBB26A]">
                  <span>{{ 'HOME.FEATURED_CATEGORIES.EXPLORE' | translate }}</span>
                  <span>→</span>
                </div>
              </div>
            </a>
          }
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
    .btn-gold-accent {
      background: linear-gradient(135deg, #CBB26A 0%, #8A7029 100%);
      color: #0A1A12;
      transition: all 0.3s ease;
    }
    .btn-gold-accent:hover {
      background: linear-gradient(135deg, #DFCA88 0%, #A38634 100%);
      transform: translateY(-1px);
    }
  `,
})
export class FeaturedCategoriesSectionComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  public readonly localeService = inject(LocaleService);

  public readonly storeCategories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly loading = this.store.selectSignal(CategoriesSelectors.loading);

  public readonly activeCategoryIndex = signal(0);

  public readonly categories = computed<CategoryItem[]>(() => {
    const list = this.storeCategories();
    if (list && list.length > 0) {
      return list;
    }
    return DEFAULT_FALLBACK_CATEGORIES;
  });

  public readonly currentActiveCategory = computed<CategoryItem | null>(() => {
    const list = this.categories();
    if (list.length === 0) return null;
    const idx = this.activeCategoryIndex();
    return list[idx % list.length] || list[0];
  });

  public getCategoryName(cat: CategoryItem): string {
    return getLocalizedName(cat.translations, this.localeService.active(), 'Atelier Collection');
  }

  public getCategoryDesc(cat: CategoryItem): string {
    return getLocalizedDescription(cat.translations, this.localeService.active(), '');
  }

  public getQueryParams(cat: CategoryItem): Record<string, any> {
    if (cat.id === 'bracelets') {
      return { search: 'bracelet' };
    }
    return { categoryId: cat.id };
  }

  public getRoman(index: number): string {
    return ROMAN_NUMERALS[index % ROMAN_NUMERALS.length] ?? `0${index + 1}`;
  }

  public onHoverCategory(index: number): void {
    this.activeCategoryIndex.set(index);
  }

  public onSelectCategory(cat: CategoryItem): void {
    const params = this.getQueryParams(cat);
    this.router.navigate(['/shop'], { queryParams: params });
  }

  public getCategoryImageUrl(cat: CategoryItem, index: number): string {
    const name = this.getCategoryName(cat).toLowerCase();
    const id = (cat.id || '').toLowerCase();

    if (name.includes('სანთელ') || name.includes('candle') || id.includes('candle')) {
      return '/images/candles_category.png';
    }
    if (name.includes('ზეთ') || name.includes('oil') || name.includes('ელექსირ') || name.includes('elixir') || id.includes('oil')) {
      return '/images/oils_category.png';
    }
    if (name.includes('თილისმ') || name.includes('talisman') || name.includes('ამულეტ') || name.includes('amulet') || id.includes('talisman')) {
      return '/images/talismans_category.png';
    }
    if (name.includes('სამაჯურ') || name.includes('bracelet') || id.includes('bracelet')) {
      return '/images/bracelets_category.png';
    }
    if (name.includes('კრისტალ') || name.includes('crystal') || name.includes('მინერალ') || name.includes('mineral')) {
      return '/images/bundles_category.png';
    }
    if (name.includes('ტარო') || name.includes('tarot') || name.includes('ბანქო') || name.includes('oracle')) {
      return '/images/bundles_category.png';
    }
    if (name.includes('საკმეველ') || name.includes('incense') || name.includes('ბალახ') || name.includes('herb')) {
      return '/images/witchlab_hero.png';
    }
    if (name.includes('საკურთხევ') || name.includes('altar')) {
      return '/images/talismans_category.png';
    }

    if (cat.imageUrl && !cat.imageUrl.includes('witchlab_hero')) {
      return cat.imageUrl;
    }

    const fallbacks = [
      '/images/candles_category.png',
      '/images/bundles_category.png',
      '/images/talismans_category.png',
      '/images/witchlab_hero.png',
      '/images/bracelets_category.png',
      '/images/oils_category.png',
    ];
    return fallbacks[index % fallbacks.length];
  }
}
