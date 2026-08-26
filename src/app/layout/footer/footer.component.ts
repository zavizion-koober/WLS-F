import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <footer class="bg-[#0D2B1D] text-[#F4F1EA] pt-16 pb-12 border-t border-[#8A7029]/30">
      <div class="atelier-container">
        <!-- Main Footer Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-16">
          <!-- Col 1 & 2: Brand and Philosophy -->
          <div class="lg:col-span-2 space-y-4 pr-0 lg:pr-8">
            <div class="flex flex-col items-start">
              <span class="font-logo text-3xl font-bold tracking-tight text-[#FCFBF9]">
                WITCHLAB
              </span>
              <span class="text-[10px] uppercase tracking-[0.25em] text-[#CBB26A] -mt-1 font-medium">
                {{ 'FOOTER.SUBTITLE' | translate }}
              </span>
            </div>

            <p class="text-sm text-[#F4F1EA]/75 leading-relaxed max-w-sm pt-2">
              {{ 'FOOTER.PHILOSOPHY' | translate }}
            </p>

            <div class="pt-2">
              <span class="inline-block text-[11px] uppercase tracking-widest text-[#CBB26A] font-semibold border-b border-[#CBB26A]/40 pb-1">
                {{ 'FOOTER.BRAND_TAG' | translate }}
              </span>
            </div>
          </div>

          <!-- Col 3: Collections / Navigation -->
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-[#CBB26A] mb-5">
              {{ 'FOOTER.COLLECTIONS_TITLE' | translate }}
            </h4>
            <ul class="space-y-3 text-sm text-[#F4F1EA]/80 font-light">
              <li>
                <a routerLink="/shop" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'NAVBAR.SHOP' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/shop" [queryParams]="{ filter: 'intentions' }" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'HOME.INTENTION_SHOP.TITLE' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/about" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'NAVBAR.OUR_STORY' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/faq" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'NAVBAR.FAQ' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/contact" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'NAVBAR.CONTACT' | translate }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Col 4: Account & Orders -->
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-[#CBB26A] mb-5">
              {{ 'PROFILE.EYEBROW' | translate }}
            </h4>
            <ul class="space-y-3 text-sm text-[#F4F1EA]/80 font-light">
              <li>
                <a routerLink="/account" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'PROFILE.NAV.OVERVIEW' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/account/orders" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'PROFILE.NAV.ORDERS' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/account/addresses" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'PROFILE.NAV.ADDRESSES' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/cart" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'NAVBAR.RITUAL_BAG' | translate }}
                </a>
              </li>
              <li>
                <a routerLink="/checkout" class="hover:text-[#CBB26A] transition-colors">
                  {{ 'CHECKOUT.EYEBROW' | translate }}
                </a>
              </li>
            </ul>
          </div>

          <!-- Col 5: Language & Esoteric Atelier -->
          <div>
            <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-[#CBB26A] mb-5">
              {{ 'NAVBAR.LANGUAGE' | translate }}
            </h4>
            <div class="flex items-center gap-2 mb-6">
              @for (lang of localeService.supported; track lang) {
                <button
                  type="button"
                  (click)="localeService.setLocale(lang)"
                  [class.bg-[#10523C]]="localeService.active() === lang"
                  [class.text-[#CBB26A]]="localeService.active() === lang"
                  [class.border-[#CBB26A]]="localeService.active() === lang"
                  class="uppercase px-3 py-1.5 text-xs font-medium border border-[#F4F1EA]/20 rounded hover:border-[#CBB26A] hover:text-[#CBB26A] transition-all cursor-pointer"
                >
                  {{ lang }}
                </button>
              }
            </div>

            <p class="text-xs text-[#F4F1EA]/60 leading-relaxed">
              {{ 'FOOTER.DESC' | translate }}
            </p>
          </div>
        </div>

        <!-- Gold Divider -->
        <div class="gold-rule mb-8"></div>

        <!-- Bottom Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F4F1EA]/60">
          <p>{{ 'FOOTER.COPYRIGHT' | translate }}</p>

          <div class="flex items-center gap-6">
            <a routerLink="/about" class="hover:text-[#CBB26A] transition-colors">
              {{ 'NAVBAR.OUR_STORY' | translate }}
            </a>
            <span>•</span>
            <a routerLink="/faq" class="hover:text-[#CBB26A] transition-colors">
              {{ 'FOOTER.FAQ' | translate }}
            </a>
            <span>•</span>
            <a routerLink="/contact" class="hover:text-[#CBB26A] transition-colors">
              {{ 'FOOTER.SUPPORT' | translate }}
            </a>
          </div>
        </div>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  public readonly localeService = inject(LocaleService);
}
