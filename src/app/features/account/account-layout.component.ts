import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { AuthSelectors } from '@store/auth/auth.selectors';
import { Logout } from '@store/auth/auth.actions';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-8 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">Home</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">Account</span>
      </nav>

      <!-- Account Header -->
      <div class="mb-10 pb-6 border-b border-[#E2DDD2] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span class="text-eyebrow text-[#8A7029]">
            {{ 'PROFILE.EYEBROW' | translate }}
          </span>
          <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1">
            {{ user()?.fullName || 'Atelier Initiate' }}
          </h1>
          <p class="text-xs text-[#5F5D56] mt-1">
            {{ user()?.email }}
          </p>
        </div>

        <button
          type="button"
          (click)="onLogout()"
          class="btn-secondary text-xs py-2 px-4 self-start sm:self-auto cursor-pointer"
        >
          {{ 'PROFILE.LOGOUT' | translate }}
        </button>
      </div>

      <!-- Account Grid (Navigation + Content) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <!-- Sidebar Navigation (3 cols) -->
        <nav class="lg:col-span-3 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-4 sm:p-6 space-y-2">
          <a
            routerLink="/account"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="bg-[#0D2B1D] text-[#FCFBF9] font-medium"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-all"
          >
            <app-icon name="user" [size]="16" />
            <span>{{ 'PROFILE.NAV.OVERVIEW' | translate }}</span>
          </a>

          <a
            routerLink="/account/orders"
            routerLinkActive="bg-[#0D2B1D] text-[#FCFBF9] font-medium"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-all"
          >
            <app-icon name="bag" [size]="16" />
            <span>{{ 'PROFILE.NAV.ORDERS' | translate }}</span>
          </a>

          <a
            routerLink="/account/addresses"
            routerLinkActive="bg-[#0D2B1D] text-[#FCFBF9] font-medium"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-all"
          >
            <app-icon name="shield" [size]="16" />
            <span>{{ 'PROFILE.NAV.ADDRESSES' | translate }}</span>
          </a>

          <a
            routerLink="/account/details"
            routerLinkActive="bg-[#0D2B1D] text-[#FCFBF9] font-medium"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-all"
          >
            <app-icon name="sparkles" [size]="16" />
            <span>{{ 'PROFILE.NAV.DETAILS' | translate }}</span>
          </a>

          <a
            routerLink="/account/security"
            routerLinkActive="bg-[#0D2B1D] text-[#FCFBF9] font-medium"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest text-[#5F5D56] hover:text-[#1A1A1D] hover:bg-[#F4F1EA] transition-all"
          >
            <app-icon name="moon" [size]="16" />
            <span>{{ 'PROFILE.NAV.SECURITY' | translate }}</span>
          </a>
        </nav>

        <!-- Nested Content (9 cols) -->
        <div class="lg:col-span-9 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-10 shadow-xs">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AccountLayoutComponent {
  private readonly store = inject(Store);

  public readonly user = this.store.selectSignal(AuthSelectors.user);

  public onLogout(): void {
    this.store.dispatch(new Logout());
  }
}
