import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { SearchModalService } from '@core/services/search-modal.service';
import { LastReadingService } from '@core/services/last-reading.service';
import { SavedBraceletsService } from '@core/services/saved-bracelets.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { CartSelectors } from '@store/cart/cart.selectors';
import { OpenCartDrawer } from '@store/cart/cart.actions';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    IconComponent,
    MobileMenuComponent,
  ],
  template: `
    <!-- Top Announcement Bar -->
    <div class="bg-[#0D2B1D] text-[#FCFBF9] py-2 px-4 text-center text-xs tracking-wide border-b border-[#CBB26A]/30">
      <div class="atelier-container flex items-center justify-center gap-2">
        <span class="text-[#CBB26A] text-xs">✦</span>
        <span class="font-light text-[#F4F1EA]/90 hidden xs:inline">{{ 'NAVBAR.ANNOUNCEMENT' | translate }}</span>
        <span class="font-light text-[#F4F1EA]/90 xs:hidden">{{ 'NAVBAR.DESIGNER' | translate }}</span>
        <span class="text-[#CBB26A]/60 hidden xs:inline">•</span>
        <a
          [routerLink]="designerLink()"
          class="text-[#CBB26A] hover:text-[#FCFBF9] underline font-medium ml-0.5 cursor-pointer transition-colors"
        >
          {{ 'NAVBAR.ANNOUNCEMENT_CTA' | translate }}
        </a>
      </div>
    </div>

    <header
      class="sticky top-0 z-40 w-full bg-[#F4F1EA]/95 backdrop-blur-md border-b border-[#E2DDD2] transition-colors duration-200"
    >
      <div class="atelier-container h-[70px] flex items-center justify-between">
        <!-- Mobile Menu Trigger -->
        <div class="flex items-center lg:hidden">
          <button
            type="button"
            (click)="mobileMenuOpen.set(true)"
            class="p-2 -ml-2 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <app-icon name="menu" [size]="22" />
          </button>
        </div>

        <!-- Left: Brand Logo -->
        <div class="flex items-center gap-8">
          <a
            routerLink="/"
            class="group flex flex-col items-start cursor-pointer text-decoration-none"
          >
            <span
              class="font-logo text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1D] group-hover:text-[#10523C] transition-colors"
            >
              WITCHLAB
            </span>
            <span class="text-[9px] uppercase tracking-[0.25em] text-[#8A7029] -mt-1 font-medium">
              {{ 'NAVBAR.ATELIER_SHOP' | translate }}
            </span>
          </a>
        </div>

        <!-- Center: Desktop Navigation -->
        <nav class="hidden lg:flex items-center gap-8" aria-label="Main navigation">
          <a
            routerLink="/shop"
            routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
            [routerLinkActiveOptions]="{ exact: false }"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            {{ 'NAVBAR.SHOP' | translate }}
          </a>

          <a
            routerLink="/shop"
            [queryParams]="{ filter: 'intentions' }"
            routerLinkActive="text-[#10523C] font-semibold"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            {{ 'NAVBAR.INTENTIONS' | translate }}
          </a>

          <a
            [routerLink]="designerLink()"
            routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
            [routerLinkActiveOptions]="{ exact: false }"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors flex items-center gap-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            <span class="text-[#8A7029] text-[11px]">✦</span>
            <span>{{ 'NAVBAR.DESIGNER' | translate }}</span>
          </a>

          @if (savedBracelets.count() > 0) {
            <a
              routerLink="/bracelets"
              routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
              class="relative py-1 text-nav text-[#10523C] hover:text-[#8A7029] transition-colors flex items-center gap-1.5 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
            >
              <span>{{ 'STONECRAFT.NAV.MY_BRACELETS' | translate }}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-[#10523C] text-[#FCFBF9] font-bold">
                {{ savedBracelets.count() }}
              </span>
            </a>
          }

          <a
            routerLink="/about"
            routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            {{ 'NAVBAR.OUR_STORY' | translate }}
          </a>

          <a
            routerLink="/faq"
            routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            {{ 'NAVBAR.FAQ' | translate }}
          </a>

          <a
            routerLink="/contact"
            routerLinkActive="text-[#10523C] font-semibold after:scale-x-100"
            class="relative py-1 text-nav text-[#1A1A1D] hover:text-[#10523C] transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1.5px] after:bg-[#10523C] after:scale-x-0 after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            {{ 'NAVBAR.CONTACT' | translate }}
          </a>
        </nav>

        <!-- Right: Actions (Language, Search, Account, Bag) -->
        <div class="flex items-center gap-3 sm:gap-5">
          <!-- Language Selector (Desktop) -->
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-[#5F5D56] font-medium border-r border-[#E2DDD2] pr-4">
            @for (lang of localeService.supported; track lang) {
              <button
                type="button"
                (click)="localeService.setLocale(lang)"
                [class.text-[#10523C]]="localeService.active() === lang"
                [class.font-bold]="localeService.active() === lang"
                [class.underline]="localeService.active() === lang"
                class="hover:text-[#10523C] transition-colors uppercase px-1 py-0.5 cursor-pointer"
              >
                {{ lang }}
              </button>
            }
          </div>

          <!-- Search Trigger Button -->
          <button
            type="button"
            (click)="searchService.open()"
            class="p-2 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            [title]="'NAVBAR.SEARCH' | translate"
            aria-label="Search"
          >
            <app-icon name="search" [size]="20" />
          </button>

          <!-- Account -->
          <a
            [routerLink]="isAuthenticated() ? '/account' : '/login'"
            class="p-2 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            [title]="isAuthenticated() ? ('NAVBAR.ACCOUNT' | translate) : ('NAVBAR.LOGIN' | translate)"
            aria-label="Account"
          >
            <app-icon name="user" [size]="20" />
          </a>

          <!-- Bag Trigger -->
          <button
            type="button"
            (click)="onOpenCart()"
            class="relative p-2 text-[#1A1A1D] hover:text-[#10523C] transition-colors cursor-pointer"
            [title]="'NAVBAR.RITUAL_BAG' | translate"
            aria-label="Shopping bag"
          >
            <app-icon name="bag" [size]="20" />
            @if (cartTotalCount() > 0) {
              <span
                class="absolute top-1 right-1 w-4 h-4 bg-[#10523C] text-[#FCFBF9] text-[10px] font-bold rounded-full flex items-center justify-center animate-fade-in"
              >
                {{ cartTotalCount() }}
              </span>
            }
          </button>
        </div>
      </div>
    </header>

    <!-- Mobile Drawer Menu -->
    <app-mobile-menu
      [isOpen]="mobileMenuOpen()"
      (close)="mobileMenuOpen.set(false)"
    />
  `,
})
export class HeaderComponent {
  public readonly localeService = inject(LocaleService);
  public readonly searchService = inject(SearchModalService);
  private readonly lastReading = inject(LastReadingService);
  protected readonly savedBracelets = inject(SavedBraceletsService);
  private readonly store = inject(Store);

  public readonly mobileMenuOpen = signal(false);

  public readonly isAuthenticated = this.store.selectSignal(AuthSelectors.isAuthenticated);
  public readonly cartTotalCount = this.store.selectSignal(CartSelectors.totalCount);

  /**
   * The bespoke bracelet flow starts at the birth details step (/reading),
   * where the user inputs their details to compute their stone palette.
   */
  public readonly designerLink = computed(() => ['/reading']);

  public onOpenCart(): void {
    this.store.dispatch(new OpenCartDrawer());
  }
}
