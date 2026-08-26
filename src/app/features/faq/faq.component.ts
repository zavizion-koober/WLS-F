import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { IconComponent } from '@shared/components/icon/icon.component';

export interface FaqItem {
  id: string;
  category: 'philosophy' | 'shipping' | 'care';
  questionKey: string;
  answerKey: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-8 pb-28 max-w-4xl">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">Home</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'NAVBAR.FAQ' | translate }}</span>
      </nav>

      <!-- Page Header -->
      <div class="mb-12 space-y-3">
        <span class="text-eyebrow text-[#8A7029]">
          {{ 'FAQ.SUBTITLE' | translate }}
        </span>
        <h1 class="font-display text-page-title font-bold text-[#1A1A1D]">
          {{ 'FAQ.TITLE' | translate }}
        </h1>
        <p class="text-sm text-[#5F5D56] leading-relaxed max-w-2xl">
          {{ 'FAQ.DESCRIPTION' | translate }}
        </p>
      </div>

      <!-- Filter Categories -->
      <div class="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-[#E2DDD2]">
        <button
          type="button"
          (click)="selectedCategory.set('all')"
          [class.bg-[#0D2B1D]]="selectedCategory() === 'all'"
          [class.text-[#FCFBF9]]="selectedCategory() === 'all'"
          [class.border-[#0D2B1D]]="selectedCategory() === 'all'"
          [class.bg-[#FCFBF9]]="selectedCategory() !== 'all'"
          [class.text-[#1A1A1D]]="selectedCategory() !== 'all'"
          class="px-5 py-2 rounded-full border border-[#E2DDD2] text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all"
        >
          {{ 'FAQ.CATEGORIES.ALL' | translate }}
        </button>

        <button
          type="button"
          (click)="selectedCategory.set('philosophy')"
          [class.bg-[#0D2B1D]]="selectedCategory() === 'philosophy'"
          [class.text-[#FCFBF9]]="selectedCategory() === 'philosophy'"
          [class.border-[#0D2B1D]]="selectedCategory() === 'philosophy'"
          [class.bg-[#FCFBF9]]="selectedCategory() !== 'philosophy'"
          [class.text-[#1A1A1D]]="selectedCategory() !== 'philosophy'"
          class="px-5 py-2 rounded-full border border-[#E2DDD2] text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all"
        >
          {{ 'FAQ.CATEGORIES.PHILOSOPHY' | translate }}
        </button>

        <button
          type="button"
          (click)="selectedCategory.set('shipping')"
          [class.bg-[#0D2B1D]]="selectedCategory() === 'shipping'"
          [class.text-[#FCFBF9]]="selectedCategory() === 'shipping'"
          [class.border-[#0D2B1D]]="selectedCategory() === 'shipping'"
          [class.bg-[#FCFBF9]]="selectedCategory() !== 'shipping'"
          [class.text-[#1A1A1D]]="selectedCategory() !== 'shipping'"
          class="px-5 py-2 rounded-full border border-[#E2DDD2] text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all"
        >
          {{ 'FAQ.CATEGORIES.SHIPPING_PACKAGING' | translate }}
        </button>

        <button
          type="button"
          (click)="selectedCategory.set('care')"
          [class.bg-[#0D2B1D]]="selectedCategory() === 'care'"
          [class.text-[#FCFBF9]]="selectedCategory() === 'care'"
          [class.border-[#0D2B1D]]="selectedCategory() === 'care'"
          [class.bg-[#FCFBF9]]="selectedCategory() !== 'care'"
          [class.text-[#1A1A1D]]="selectedCategory() !== 'care'"
          class="px-5 py-2 rounded-full border border-[#E2DDD2] text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all"
        >
          {{ 'FAQ.CATEGORIES.CARE_SAFETY' | translate }}
        </button>
      </div>

      <!-- FAQ Accordion List -->
      <div class="space-y-4">
        @for (item of filteredFaqs(); track item.id) {
          <details class="group bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 transition-all duration-200">
            <summary class="flex items-center justify-between text-sm sm:text-base font-semibold text-[#1A1A1D] cursor-pointer select-none font-display list-none">
              <span>{{ item.questionKey | translate }}</span>
              <span class="group-open:rotate-180 transition-transform text-[#8D8A81] ml-4 shrink-0">
                <app-icon name="chevron-down" [size]="18" />
              </span>
            </summary>
            <div class="pt-4 text-xs sm:text-sm text-[#5F5D56] leading-relaxed border-t border-[#E2DDD2]/60 mt-4 font-body">
              {{ item.answerKey | translate }}
            </div>
          </details>
        }
      </div>

      <!-- Contact Support Banner -->
      <div class="mt-16 p-8 bg-[#F4F1EA] border border-[#E2DDD2] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h3 class="font-display text-lg font-bold text-[#1A1A1D] mb-1">
            {{ 'FAQ.CONTACT.TITLE' | translate }}
          </h3>
          <p class="text-xs text-[#5F5D56] leading-relaxed max-w-md">
            {{ 'FAQ.CONTACT.DESCRIPTION' | translate }}
          </p>
        </div>

        <a routerLink="/contact" class="btn-primary text-xs py-3 px-5 shrink-0">
          {{ 'FAQ.CONTACT.CTA' | translate }}
        </a>
      </div>
    </div>
  `,
})
export class FaqComponent {
  public readonly selectedCategory = signal<'all' | 'philosophy' | 'shipping' | 'care'>('all');

  public readonly faqs: FaqItem[] = [
    {
      id: 'choose_collection',
      category: 'philosophy',
      questionKey: 'FAQ.ITEMS.CHOOSE_COLLECTION.QUESTION',
      answerKey: 'FAQ.ITEMS.CHOOSE_COLLECTION.ANSWER',
    },
    {
      id: 'moon_phases',
      category: 'philosophy',
      questionKey: 'FAQ.ITEMS.MOON_PHASES.QUESTION',
      answerKey: 'FAQ.ITEMS.MOON_PHASES.ANSWER',
    },
    {
      id: 'crystal_chips',
      category: 'care',
      questionKey: 'FAQ.ITEMS.CRYSTAL_CHIPS.QUESTION',
      answerKey: 'FAQ.ITEMS.CRYSTAL_CHIPS.ANSWER',
    },
    {
      id: 'shelf_life',
      category: 'care',
      questionKey: 'FAQ.ITEMS.SHELF_LIFE.QUESTION',
      answerKey: 'FAQ.ITEMS.SHELF_LIFE.ANSWER',
    },
    {
      id: 'energetic_frequency',
      category: 'shipping',
      questionKey: 'FAQ.ITEMS.ENERGETIC_FREQUENCY.QUESTION',
      answerKey: 'FAQ.ITEMS.ENERGETIC_FREQUENCY.ANSWER',
    },
    {
      id: 'international_shipping',
      category: 'shipping',
      questionKey: 'FAQ.ITEMS.INTERNATIONAL_SHIPPING.QUESTION',
      answerKey: 'FAQ.ITEMS.INTERNATIONAL_SHIPPING.ANSWER',
    },
  ];

  public filteredFaqs(): FaqItem[] {
    const cat = this.selectedCategory();
    if (cat === 'all') return this.faqs;
    return this.faqs.filter((f) => f.category === cat);
  }
}
