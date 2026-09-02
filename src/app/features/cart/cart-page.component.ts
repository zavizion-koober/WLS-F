import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { CartSelectors } from '@store/cart/cart.selectors';
import {
  ClearCart,
  RemoveFromCart,
  UpdateCartQuantity,
} from '@store/cart/cart.actions';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { QuantitySelectorComponent } from '@shared/components/quantity-selector/quantity-selector.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { CartLine } from '@store/cart/cart.models';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    PricePipe,
    AssetUrlPipe,
    IconComponent,
    QuantitySelectorComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="atelier-container pt-8 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">{{ 'PRODUCT_DETAIL.HOME' | translate }}</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">{{ 'NAVBAR.RITUAL_BAG' | translate }}</span>
      </nav>

      <!-- Page Title -->
      <div class="mb-10 pb-6 border-b border-[#E2DDD2] flex items-end justify-between">
        <div>
          <span class="text-eyebrow text-[#8A7029]">
            {{ 'CHECKOUT.CART.REVIEW' | translate }}
          </span>
          <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1">
            {{ 'CHECKOUT.CART.YOUR_BAG' | translate }}
          </h1>
        </div>

        @if (lines().length > 0) {
          <button
            type="button"
            (click)="onClearCart()"
            class="text-xs uppercase tracking-wider text-[#8D8A81] hover:text-red-700 transition-colors font-medium cursor-pointer"
          >
            {{ 'CHECKOUT.CART.CLEAR' | translate }}
          </button>
        }
      </div>

      @if (lines().length === 0) {
        <app-empty-state
          icon="bag"
          [title]="'CHECKOUT.CART.EMPTY' | translate"
          [description]="'CHECKOUT.CART.EMPTY_DESC' | translate"
          [actionLabel]="'CHECKOUT.CART.BROWSE' | translate"
          actionLink="/shop"
        />
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <!-- Items List (8 cols desktop) -->
          <div class="lg:col-span-8 space-y-4">
            @for (item of lines(); track item.productId) {
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl shadow-xs">
                <!-- Product info & image -->
                <div class="flex items-center gap-5 min-w-0">
                  @if (item.customBracelet; as custom) {
                    <div class="w-20 h-26 rounded-lg bg-[#F4F1EA] border border-[#E2DDD2] shrink-0 flex items-center justify-center p-2">
                      <img
                        [src]="item.imageUrl | assetUrl"
                        [alt]="item.name"
                        class="w-full h-full object-contain"
                      />
                    </div>

                    <div class="space-y-1 min-w-0">
                      <span class="inline-block text-[9px] uppercase tracking-widest font-semibold text-[#8A7029]">
                        ✦ {{ 'STONECRAFT.NAV.DESIGNER' | translate }}
                      </span>
                      <h3 class="font-body text-base sm:text-lg font-semibold text-[#1A1A1D] product-title">
                        {{ item.name }}
                      </h3>
                      <p class="text-xs text-[#5F5D56]">
                        {{ formatCustomDetails(custom) }}
                      </p>
                      <div class="pt-1">
                        <a
                          [routerLink]="['/designer', custom.readingPublicId]"
                          [queryParams]="{ braceletId: custom.id }"
                          class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#10523C] hover:text-[#8A7029] transition-colors"
                        >
                          <span>{{ 'STONECRAFT.ACTIONS.EDIT_CONFIG' | translate }}</span>
                          <app-icon name="arrow-right" [size]="12" />
                        </a>
                      </div>
                      <p class="text-sm font-semibold text-[#10523C] pt-1">
                        {{ item.price | price }}
                      </p>
                    </div>
                  } @else {
                    <a [routerLink]="['/product', item.productId]" class="shrink-0">
                      <img
                        [src]="item.imageUrl | assetUrl"
                        [alt]="item.name"
                        class="w-20 h-26 object-cover rounded-lg bg-[#F4F1EA] border border-[#E2DDD2]"
                      />
                    </a>

                    <div class="space-y-1">
                      <h3 class="font-body text-base sm:text-lg font-semibold text-[#1A1A1D] hover:text-[#10523C] transition-colors product-title">
                        <a [routerLink]="['/product', item.productId]">
                          {{ item.name }}
                        </a>
                      </h3>

                      <p class="text-sm font-semibold text-[#10523C]">
                        {{ item.price | price }}
                      </p>

                      @if (item.stockQuantity <= 5) {
                        <p class="text-[11px] text-[#8A7029]">
                          {{ 'PRODUCT_DETAIL.ONLY_STOCK' | translate: { count: item.stockQuantity } }}
                        </p>
                      }
                    </div>
                  }
                </div>

                <!-- Controls & Total -->
                <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-[#E2DDD2]/60 shrink-0">
                  <app-quantity-selector
                    [value]="item.quantity"
                    [max]="item.stockQuantity || 99"
                    (valueChange)="onUpdateQuantity(item, $event)"
                  />

                  <div class="text-right min-w-[80px]">
                    <span class="text-base font-semibold text-[#1A1A1D]">
                      {{ item.price * item.quantity | price }}
                    </span>
                  </div>

                  <button
                    type="button"
                    (click)="onRemoveItem(item)"
                    class="p-2 text-[#8D8A81] hover:text-red-700 transition-colors cursor-pointer"
                    [title]="'CHECKOUT.CART.REMOVE' | translate"
                  >
                    <app-icon name="trash" [size]="16" />
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Order Summary Card (4 cols desktop) -->
          <div class="lg:col-span-4 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-8 space-y-6 sticky top-24">
            <h2 class="text-sm font-semibold uppercase tracking-widest text-[#1A1A1D] pb-4 border-b border-[#E2DDD2]">
              {{ 'CHECKOUT.SUMMARY.TITLE' | translate }}
            </h2>

            <div class="space-y-3 text-sm">
              <div class="flex items-center justify-between text-[#5F5D56]">
                <span>{{ 'CHECKOUT.SUMMARY.TOTAL_ITEMS' | translate }}</span>
                <span class="font-medium text-[#1A1A1D]">{{ totalCount() }}</span>
              </div>

              <div class="flex items-center justify-between text-[#5F5D56]">
                <span>{{ 'CHECKOUT.SUMMARY.SUBTOTAL' | translate }}:</span>
                <span class="font-semibold text-lg text-[#1A1A1D]">
                  {{ subtotal() | price }}
                </span>
              </div>
            </div>

            <p class="text-xs text-[#8D8A81] leading-relaxed pt-2 border-t border-[#E2DDD2]/60">
              {{ 'CHECKOUT.SUMMARY.NOTE' | translate }}
            </p>

            <a
              routerLink="/checkout"
              class="btn-primary w-full text-center text-xs py-4 flex items-center justify-center gap-2"
            >
              <span>{{ 'CHECKOUT.ACTIONS.PROCEED' | translate }}</span>
              <app-icon name="arrow-right" [size]="16" />
            </a>

            <a
              routerLink="/shop"
              class="block text-center text-xs uppercase tracking-wider text-[#5F5D56] hover:text-[#10523C] transition-colors"
            >
              ← {{ 'CHECKOUT.ACTIONS.CONTINUE_SHOPPING' | translate }}
            </a>
          </div>
        </div>
      }
    </div>
  `,
})
export class CartPageComponent {
  private readonly store = inject(Store);

  public readonly lines = this.store.selectSignal(CartSelectors.lines);
  public readonly totalCount = this.store.selectSignal(CartSelectors.totalCount);
  public readonly subtotal = this.store.selectSignal(CartSelectors.subtotal);

  public onUpdateQuantity(line: CartLine, quantity: number): void {
    this.store.dispatch(new UpdateCartQuantity(line.productId, line.itemId, quantity));
  }

  public onRemoveItem(line: CartLine): void {
    this.store.dispatch(new RemoveFromCart(line.productId, line.itemId));
  }

  public onClearCart(): void {
    this.store.dispatch(new ClearCart());
  }

  public formatCustomDetails(custom: any): string {
    const stonesSummary = custom.stones
      ?.map((s: any) => `${s.name} (${s.count})`)
      .slice(0, 4)
      .join(', ');
    return `${stonesSummary || 'Custom stones'} • Wrist: ${custom.wristMm}mm • Beads: ${custom.diameterMm}mm`;
  }
}
