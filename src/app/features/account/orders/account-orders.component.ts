import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { OrdersSelectors } from '@store/orders/orders.selectors';
import { CancelOrder, LoadMyOrders } from '@store/orders/orders.actions';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { LoadingSkeletonComponent } from '@shared/components/loading-skeleton/loading-skeleton.component';
import { CustomerOrder } from '@store/orders/orders.models';

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    PricePipe,
    AssetUrlPipe,
    IconComponent,
    EmptyStateComponent,
    LoadingSkeletonComponent,
  ],
  template: `
    <div class="space-y-6">
      <div class="pb-4 border-b border-[#E2DDD2]">
        <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D]">
          {{ 'PROFILE.ORDERS.TITLE' | translate }}
        </h2>
        <p class="text-xs text-[#5F5D56] mt-0.5">
          History of all consecrated orders placed through your WitchLab account.
        </p>
      </div>

      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <app-loading-skeleton height="160px" customClass="rounded-xl" />
          }
        </div>
      } @else if (orders().length === 0) {
        <app-empty-state
          icon="bag"
          [title]="'PROFILE.ORDERS.EMPTY' | translate"
          description="You have no recorded ritual orders yet. Explore our botanical apothecary and talisman collections."
          [actionLabel]="'PROFILE.ORDERS.BROWSE' | translate"
          actionLink="/shop"
        />
      } @else {
        <div class="space-y-6">
          @for (order of orders(); track order.id) {
            <div class="bg-[#F4F1EA]/40 border border-[#E2DDD2] rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
              <!-- Order Header: ID, Date, Status, Total -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2DDD2]">
                <div class="space-y-1">
                  <div class="flex items-center gap-3">
                    <span class="font-mono font-semibold text-xs text-[#1A1A1D]">
                      #{{ order.id.slice(0, 8) }}...
                    </span>
                    <span
                      class="px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      [ngClass]="{
                        'bg-[#10523C]/10 text-[#10523C] border border-[#10523C]/30': order.status === 'CONFIRMED' || order.status === 'DELIVERED',
                        'bg-[#8A7029]/10 text-[#8A7029] border border-[#8A7029]/30': order.status === 'PENDING' || order.status === 'SHIPPED',
                        'bg-red-700/10 text-red-700 border border-red-700/30': order.status === 'CANCELLED'
                      }"
                    >
                      {{ order.status }}
                    </span>
                  </div>

                  <p class="text-[11px] text-[#8D8A81]">
                    Placed on {{ order.createdAt | date : 'mediumDate' }}
                  </p>
                </div>

                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <span class="text-[11px] text-[#8D8A81] block">Total:</span>
                    <span class="font-bold text-sm text-[#10523C]">
                      {{ order.totalPrice | price }}
                    </span>
                  </div>

                  @if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
                    <button
                      type="button"
                      (click)="onCancelOrder(order)"
                      class="btn-secondary text-[10px] py-1.5 px-3 text-red-800 border-red-800/40 hover:bg-red-50"
                    >
                      {{ 'PROFILE.ORDERS.CANCEL' | translate }}
                    </button>
                  }
                </div>
              </div>

              <!-- Order Items List -->
              <div class="space-y-3">
                @for (item of order.items; track item.id) {
                  <div class="flex items-center justify-between gap-4 text-xs">
                    <div class="flex items-center gap-3">
                      <img
                        [src]="item.product?.images?.[0]?.url | assetUrl"
                        [alt]="item.product?.translations?.[0]?.name || 'Ritual item'"
                        class="w-12 h-14 object-cover rounded bg-[#FCFBF9] border border-[#E2DDD2]"
                      />
                      <div>
                        <h4 class="font-body font-semibold text-sm text-[#1A1A1D] product-title">
                          {{ item.product?.translations?.[0]?.name || 'Consecrated Offering' }}
                        </h4>
                        <p class="text-[#8D8A81]">
                          Quantity: {{ item.quantity }} × {{ item.price.amount | price }}
                        </p>
                      </div>
                    </div>

                    <span class="font-medium text-[#1A1A1D]">
                      {{ item.price.amount | price }}
                    </span>
                  </div>
                }
              </div>

              <!-- Shipping Destination -->
              @if (order.shippingAddress) {
                <div class="pt-3 border-t border-[#E2DDD2]/60 text-[11px] text-[#8D8A81] flex items-center gap-2">
                  <app-icon name="shield" [size]="14" />
                  <span>
                    Ship to: {{ order.shippingAddress.street }}, {{ order.shippingAddress.city }}, {{ order.shippingAddress.country }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AccountOrdersComponent implements OnInit {
  private readonly store = inject(Store);

  public readonly orders = this.store.selectSignal(OrdersSelectors.orders);
  public readonly loading = this.store.selectSignal(OrdersSelectors.loading);

  ngOnInit(): void {
    this.store.dispatch(new LoadMyOrders({ take: 20 }));
  }

  public onCancelOrder(order: CustomerOrder): void {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.store.dispatch(new CancelOrder(order.id));
    }
  }
}
