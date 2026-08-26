import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { LocaleService } from '@core/services/locale.service';
import { getLocalizedName } from '@core/utils/translation.utils';
import { SearchModalService } from '@core/services/search-modal.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { Logout } from '@store/auth/auth.actions';
import { CategoriesSelectors } from '@store/categories/categories.selectors';
import { IntentionsSelectors } from '@store/intentions/intentions.selectors';

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, IconComponent],
  template: `
    <!-- Backdrop -->
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-[#050507]/60 backdrop-blur-xs z-50 transition-opacity duration-300"
        (click)="close.emit()"
      ></div>
    }

    <!-- Drawer Panel -->
    <aside
      class="fixed inset-y-0 left-0 w-[85%] max-w-[340px] bg-[#F4F1EA] border-r border-[#E2DDD2] z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out shadow-2xl"
      [class.translate-x-0]="isOpen()"
      [class.-translate-x-full]="!isOpen()"
    >
      <!-- Top header with close -->
      <div class="p-6 border-b border-[#E2DDD2] flex items-center justify-between">
        <div>
          <span class="font-logo text-xl font-bold tracking-tight text-[#1A1A1D]">
            WITCHLAB
          </span>
          <span class="block text-[9px] uppercase tracking-[0.2em] text-[#8A7029] font-medium">
            {{ 'NAVBAR.ATELIER_SHOP' | translate }}
          </span>
        </div>

        <button
          type="button"
          (click)="close.emit()"
          class="p-2 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <app-icon name="close" [size]="20" />
        </button>
      </div>

      <!-- Nav Links -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <!-- Search Trigger -->
        <button
          type="button"
          (click)="onOpenSearch()"
          class="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border border-[#E2DDD2] bg-[#FCFBF9] text-xs uppercase tracking-wider font-semibold text-[#1A1A1D] hover:border-[#10523C] hover:text-[#10523C] transition-colors cursor-pointer shadow-2xs"
        >
          <div class="flex items-center gap-2.5">
            <app-icon name="search" [size]="16" customClass="text-[#10523C]" />
            <span>{{ 'NAVBAR.SEARCH' | translate }}</span>
          </div>
          <app-icon name="arrow-right" [size]="13" customClass="text-[#8D8A81]" />
        </button>

        <nav class="flex flex-col space-y-4">
          <a
            routerLink="/shop"
            (click)="close.emit()"
            class="text-sm uppercase tracking-widest font-semibold text-[#1A1A1D] hover:text-[#10523C] transition-colors flex items-center justify-between py-1"
          >
            <span>{{ 'NAVBAR.SHOP' | translate }}</span>
            <app-icon name="chevron-right" [size]="16" />
          </a>

          <a
            routerLink="/about"
            (click)="close.emit()"
            class="text-sm uppercase tracking-widest font-semibold text-[#1A1A1D] hover:text-[#10523C] transition-colors flex items-center justify-between py-1"
          >
            <span>{{ 'NAVBAR.OUR_STORY' | translate }}</span>
            <app-icon name="chevron-right" [size]="16" />
          </a>

          <a
            routerLink="/faq"
            (click)="close.emit()"
            class="text-sm uppercase tracking-widest font-semibold text-[#1A1A1D] hover:text-[#10523C] transition-colors flex items-center justify-between py-1"
          >
            <span>{{ 'NAVBAR.FAQ' | translate }}</span>
            <app-icon name="chevron-right" [size]="16" />
          </a>

          <a
            routerLink="/contact"
            (click)="close.emit()"
            class="text-sm uppercase tracking-widest font-semibold text-[#1A1A1D] hover:text-[#10523C] transition-colors flex items-center justify-between py-1"
          >
            <span>{{ 'NAVBAR.CONTACT' | translate }}</span>
            <app-icon name="chevron-right" [size]="16" />
          </a>
        </nav>

        <div class="gold-rule"></div>

        <!-- Quick Categories -->
        <div>
          <h4 class="text-[11px] uppercase tracking-widest text-[#8A7029] font-medium mb-3">
            {{ 'NAVBAR.COLLECTIONS' | translate }}
          </h4>
          <div class="flex flex-col space-y-2">
            @for (cat of categories(); track cat.id) {
              <a
                [routerLink]="['/shop']"
                [queryParams]="{ categoryId: cat.id }"
                (click)="close.emit()"
                class="text-xs text-[#5F5D56] hover:text-[#10523C] transition-colors py-1"
              >
                {{ getCategoryItemName(cat) }}
              </a>
            }
          </div>
        </div>

        <div class="gold-rule"></div>

        <!-- Quick Intentions -->
        <div>
          <h4 class="text-[11px] uppercase tracking-widest text-[#8A7029] font-medium mb-3">
            {{ 'HOME.INTENTION_SHOP.TITLE' | translate }}
          </h4>
          <div class="flex flex-col space-y-2">
            @for (intent of intentions(); track intent.id) {
              <a
                [routerLink]="['/shop']"
                [queryParams]="{ intentionId: intent.id }"
                (click)="close.emit()"
                class="text-xs text-[#5F5D56] hover:text-[#10523C] transition-colors py-1"
              >
                {{ getIntentionItemName(intent) }}
              </a>
            }
          </div>
        </div>
      </div>

      <!-- Bottom Account & Language section -->
      <div class="p-6 border-t border-[#E2DDD2] bg-[#FCFBF9] space-y-4">
        <!-- Account link -->
        @if (isAuthenticated()) {
          <div class="flex items-center justify-between">
            <a
              routerLink="/account"
              (click)="close.emit()"
              class="text-xs font-semibold text-[#1A1A1D] hover:text-[#10523C] flex items-center gap-2"
            >
              <app-icon name="user" [size]="16" />
              <span>{{ 'PROFILE.EYEBROW' | translate }}</span>
            </a>

            <button
              type="button"
              (click)="onLogout()"
              class="text-xs text-[#8D8A81] hover:text-red-700 transition-colors cursor-pointer"
            >
              {{ 'PROFILE.LOGOUT' | translate }}
            </button>
          </div>
        } @else {
          <div class="flex items-center gap-3">
            <a
              routerLink="/login"
              (click)="close.emit()"
              class="flex-1 btn-primary py-2 text-center text-xs"
            >
              {{ 'AUTH.LOG_IN_BTN' | translate }}
            </a>
            <a
              routerLink="/register"
              (click)="close.emit()"
              class="flex-1 btn-secondary py-2 text-center text-xs"
            >
              {{ 'AUTH.SIGN_UP' | translate }}
            </a>
          </div>
        }

        <!-- Language switcher -->
        <div class="flex items-center justify-center gap-4 pt-2 border-t border-[#E2DDD2]/60">
          @for (lang of localeService.supported; track lang) {
            <button
              type="button"
              (click)="localeService.setLocale(lang)"
              [class.text-[#10523C]]="localeService.active() === lang"
              [class.font-bold]="localeService.active() === lang"
              [class.underline]="localeService.active() === lang"
              class="uppercase px-2 py-1 text-xs text-[#5F5D56] hover:text-[#1A1A1D] cursor-pointer"
            >
              {{ lang }}
            </button>
          }
        </div>
      </div>
    </aside>
  `,
})
export class MobileMenuComponent {
  public readonly isOpen = input<boolean>(false);
  public readonly close = output<void>();

  public readonly localeService = inject(LocaleService);
  public readonly searchService = inject(SearchModalService);
  private readonly store = inject(Store);

  public readonly isAuthenticated = this.store.selectSignal(AuthSelectors.isAuthenticated);
  public readonly categories = this.store.selectSignal(CategoriesSelectors.categories);
  public readonly intentions = this.store.selectSignal(IntentionsSelectors.intentions);

  public onOpenSearch(): void {
    this.close.emit();
    this.searchService.open();
  }

  public onLogout(): void {
    this.close.emit();
    this.store.dispatch(new Logout());
  }

  public getCategoryItemName(cat: any): string {
    return getLocalizedName(cat.translations, this.localeService.active(), 'Category');
  }

  public getIntentionItemName(intent: any): string {
    return getLocalizedName(intent.translations, this.localeService.active(), 'Intention');
  }
}
