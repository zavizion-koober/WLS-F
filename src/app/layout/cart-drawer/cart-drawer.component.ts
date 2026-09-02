import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { CartSelectors } from '@store/cart/cart.selectors';
import {
  CloseCartDrawer,
  RemoveFromCart,
  UpdateCartQuantity,
} from '@store/cart/cart.actions';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { QuantitySelectorComponent } from '@shared/components/quantity-selector/quantity-selector.component';
import { CartLine } from '@store/cart/cart.models';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    IconComponent,
    PricePipe,
    AssetUrlPipe,
    QuantitySelectorComponent,
  ],
  template: `
    <!-- Backdrop -->
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-[#050507]/60 backdrop-blur-xs z-50 transition-opacity duration-300 animate-fade-in"
        (click)="onClose()"
      ></div>
    }

    <!-- Drawer Panel -->
    <aside
      class="fixed inset-y-0 right-0 w-full max-w-md bg-[#FCFBF9] border-l border-[#E2DDD2] z-50 flex flex-col justify-between transform transition-transform duration-300 ease-out shadow-2xl"
      [class.translate-x-0]="isOpen()"
      [class.translate-x-full]="!isOpen()"
    >
      <!-- Top header -->
      <div class="p-5 border-b border-[#E2DDD2] flex items-center justify-between bg-[#F4F1EA]">
        <div class="flex items-center gap-2">
          <app-icon name="bag" [size]="20" customClass="text-[#10523C]" />
          <h2 class="text-sm font-semibold uppercase tracking-widest text-[#1A1A1D]">
            {{ 'NAVBAR.RITUAL_BAG' | translate }}
            @if (totalCount() > 0) {
              <span class="text-[#8A7029]">({{ totalCount() }})</span>
            }
          </h2>
        </div>

        <button
          type="button"
          (click)="onClose()"
          class="p-1.5 text-[#5F5D56] hover:text-[#1A1A1D] transition-colors cursor-pointer"
          aria-label="Close bag"
        >
          <app-icon name="close" [size]="18" />
        </button>
      </div>

      <!-- Items list -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4">
        @if (lines().length === 0) {
          <div class="flex flex-col items-center justify-center text-center py-16">
            <div class="w-14 h-14 rounded-full bg-[#F4F1EA] flex items-center justify-center text-[#8A7029] mb-4">
              <app-icon name="bag" [size]="24" />
            </div>
            <p class="text-base font-display font-medium text-[#1A1A1D] mb-1">
              {{ 'CHECKOUT.CART.EMPTY' | translate }}
            </p>
            <p class="text-xs text-[#5F5D56] max-w-xs mb-6">
              {{ 'CHECKOUT.CART.EMPTY_DESC' | translate }}
            </p>
            <a
              routerLink="/shop"
              (click)="onClose()"
              class="btn-secondary text-xs py-2.5 px-5"
            >
              {{ 'CHECKOUT.CART.BROWSE' | translate }}
            </a>
          </div>
        } @else {
          @for (item of lines(); track item.productId) {
            <div class="flex gap-4 p-3.5 bg-[#F4F1EA]/60 rounded-xl border border-[#E2DDD2]/70 shadow-2xs">
              <!-- Thumbnail -->
              <div class="w-18 h-22 rounded-lg bg-[#FCFBF9] border border-[#E2DDD2] shrink-0 overflow-hidden flex items-center justify-center p-1">
                <img
                  [src]="item.imageUrl | assetUrl"
                  [alt]="item.name"
                  class="w-full h-full object-contain"
                />
              </div>

              <!-- Info -->
              <div class="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      @if (item.customBracelet) {
                        <span class="inline-block text-[9px] uppercase tracking-wider font-semibold text-[#8A7029] mb-0.5">
                          ✦ {{ 'STONECRAFT.NAV.DESIGNER' | translate }}
                        </span>
                      }
                      <h3 class="text-sm font-semibold text-[#1A1A1D] font-body product-title line-clamp-1">
                        {{ item.name }}
                      </h3>
                    </div>

                    <button
                      type="button"
                      (click)="onRemoveItem(item)"
                      class="text-[#8D8A81] hover:text-red-700 transition-colors p-1 cursor-pointer"
                      [title]="'CHECKOUT.CART.REMOVE' | translate"
                    >
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </div>

                  @if (item.customBracelet; as custom) {
                    <p class="text-[11px] text-[#5F5D56] line-clamp-1 mt-0.5">
                      {{ formatCustomDetails(custom) }}
                    </p>
                    <a
                      [routerLink]="['/designer', custom.readingPublicId]"
                      [queryParams]="{ braceletId: custom.id }"
                      (click)="onClose()"
                      class="inline-flex items-center gap-1 text-[10.5px] uppercase tracking-wider font-semibold text-[#10523C] hover:text-[#8A7029] mt-1 transition-colors"
                    >
                      <span>{{ 'STONECRAFT.ACTIONS.EDIT_CONFIG' | translate }}</span>
                      <app-icon name="arrow-right" [size]="10" />
                    </a>
                  }

                  <p class="text-xs font-semibold text-[#10523C] mt-1">
                    {{ item.price | price }}
                  </p>
                </div>

                <!-- Quantity -->
                <div class="flex items-center justify-between mt-3">
                  <app-quantity-selector
                    [value]="item.quantity"
                    [max]="item.stockQuantity || 99"
                    (valueChange)="onUpdateQuantity(item, $event)"
                  />

                  <span class="text-xs font-medium text-[#5F5D56]">
                    {{ item.price * item.quantity | price }}
                  </span>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Bottom Checkout / Subtotal Section -->
      @if (lines().length > 0) {
        <div class="p-5 border-t border-[#E2DDD2] bg-[#FCFBF9] space-y-4">
          <!-- Subtotal -->
          <div class="flex items-center justify-between">
            <span class="text-xs uppercase tracking-widest text-[#5F5D56] font-medium">
              {{ 'CHECKOUT.SUMMARY.SUBTOTAL' | translate }}
            </span>
            <span class="text-lg font-semibold text-[#1A1A1D]">
              {{ subtotal() | price }}
            </span>
          </div>

          <p class="text-[11px] text-[#8D8A81] leading-tight">
            {{ 'CHECKOUT.SUMMARY.SHIPPING_NOTE' | translate }}
          </p>

          <!-- Actions -->
          <div class="flex flex-col gap-2 pt-1">
            <a
              routerLink="/checkout"
              (click)="onClose()"
              class="btn-primary w-full text-center text-xs py-3.5 flex items-center justify-center gap-2"
            >
              <span>{{ 'CHECKOUT.ACTIONS.PROCEED' | translate }}</span>
              <app-icon name="arrow-right" [size]="16" />
            </a>

            <a
              routerLink="/cart"
              (click)="onClose()"
              class="btn-secondary w-full text-center text-xs py-2.5"
            >
              {{ 'CHECKOUT.ACTIONS.VIEW_FULL_BAG' | translate }}
            </a>
          </div>
        </div>
      }
    </aside>
  `,
})
export class CartDrawerComponent {
  private readonly store = inject(Store);

  public readonly isOpen = this.store.selectSignal(CartSelectors.drawerOpen);
  public readonly lines = this.store.selectSignal(CartSelectors.lines);
  public readonly totalCount = this.store.selectSignal(CartSelectors.totalCount);
  public readonly subtotal = this.store.selectSignal(CartSelectors.subtotal);

  public onClose(): void {
    this.store.dispatch(new CloseCartDrawer());
  }

  public onUpdateQuantity(line: CartLine, quantity: number): void {
    this.store.dispatch(new UpdateCartQuantity(line.productId, line.itemId, quantity));
  }

  public onRemoveItem(line: CartLine): void {
    this.store.dispatch(new RemoveFromCart(line.productId, line.itemId));
  }

  public formatCustomDetails(custom: any): string {
    const stonesSummary = custom.stones
      ?.map((s: any) => `${s.name} (${s.count})`)
      .slice(0, 3)
      .join(', ');
    return `${stonesSummary || 'Custom stones'} • ${custom.wristMm}mm`;
  }
}
