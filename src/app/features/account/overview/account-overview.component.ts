import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileSelectors } from '@store/profile/profile.selectors';
import { LoadProfile } from '@store/profile/profile.actions';
import { OrdersSelectors } from '@store/orders/orders.selectors';
import { LoadMyOrders } from '@store/orders/orders.actions';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="space-y-8">
      <div>
        <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D] mb-1">
          {{ 'PROFILE.OVERVIEW.TITLE' | translate }}
        </h2>
        <p class="text-xs text-[#5F5D56]">
          Summary of your atelier credentials, recent activity, and shipping configurations.
        </p>
      </div>

      <!-- Overview Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Personal info card -->
        <div class="p-5 rounded-lg border border-[#E2DDD2] bg-[#F4F1EA]/60 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#1A1A1D]">
              Initiate Details
            </span>
            <a routerLink="/account/details" class="text-xs text-[#8A7029] hover:underline">
              {{ 'PROFILE.ACTIONS.EDIT' | translate }}
            </a>
          </div>

          <div class="space-y-1 text-xs text-[#5F5D56]">
            <p><strong class="text-[#1A1A1D]">{{ 'PROFILE.OVERVIEW.NAME' | translate }}:</strong> {{ profile()?.fullName }}</p>
            <p><strong class="text-[#1A1A1D]">{{ 'PROFILE.OVERVIEW.EMAIL' | translate }}:</strong> {{ profile()?.email }}</p>
            <p><strong class="text-[#1A1A1D]">{{ 'PROFILE.OVERVIEW.PHONE' | translate }}:</strong> {{ profile()?.details?.phoneNumber || ('PROFILE.OVERVIEW.NOT_SET' | translate) }}</p>
          </div>
        </div>

        <!-- Default Address card -->
        <div class="p-5 rounded-lg border border-[#E2DDD2] bg-[#F4F1EA]/60 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-[#1A1A1D]">
              Default Address
            </span>
            <a routerLink="/account/addresses" class="text-xs text-[#8A7029] hover:underline">
              Manage
            </a>
          </div>

          @if (defaultAddress()) {
            <div class="space-y-1 text-xs text-[#5F5D56]">
              <p class="font-medium text-[#1A1A1D]">{{ defaultAddress()?.street }}</p>
              <p>{{ defaultAddress()?.city }}, {{ defaultAddress()?.zipCode }}</p>
              <p>{{ defaultAddress()?.country }}</p>
            </div>
          } @else {
            <p class="text-xs text-[#8D8A81]">No default shipping address saved.</p>
          }
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="pt-4 border-t border-[#E2DDD2] flex flex-wrap items-center gap-4">
        <a routerLink="/account/orders" class="btn-primary text-xs py-3 px-5">
          View Your Orders ({{ totalOrders() }})
        </a>

        <a routerLink="/shop" class="btn-secondary text-xs py-3 px-5">
          Browse Atelier Collection
        </a>
      </div>
    </div>
  `,
})
export class AccountOverviewComponent implements OnInit {
  private readonly store = inject(Store);

  public readonly profile = this.store.selectSignal(ProfileSelectors.profile);
  public readonly defaultAddress = this.store.selectSignal(ProfileSelectors.defaultAddress);
  public readonly totalOrders = this.store.selectSignal(OrdersSelectors.totalCount);

  ngOnInit(): void {
    this.store.dispatch(new LoadProfile());
    this.store.dispatch(new LoadMyOrders({ take: 5 }));
  }
}
