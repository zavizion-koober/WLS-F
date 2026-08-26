import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { CartSelectors } from '@store/cart/cart.selectors';
import { ProfileSelectors } from '@store/profile/profile.selectors';
import { AddAddress, LoadProfile } from '@store/profile/profile.actions';
import { CheckoutOrder } from '@store/orders/orders.actions';
import { OrdersSelectors } from '@store/orders/orders.selectors';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { PricePipe } from '@shared/pipes/price.pipe';
import { AssetUrlPipe } from '@shared/pipes/asset-url.pipe';
import { IconComponent } from '@shared/components/icon/icon.component';
import { NotificationService } from '@core/services/notification.service';
import { UserAddress } from '@store/profile/profile.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    PricePipe,
    AssetUrlPipe,
    IconComponent,
  ],
  template: `
    <div class="atelier-container pt-8 pb-24">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8D8A81] mb-8">
        <a routerLink="/" class="hover:text-[#10523C] transition-colors">Home</a>
        <span>/</span>
        <a routerLink="/cart" class="hover:text-[#10523C] transition-colors">Bag</a>
        <span>/</span>
        <span class="text-[#1A1A1D] font-medium">Checkout</span>
      </nav>

      <!-- Page Header -->
      <div class="mb-10 pb-6 border-b border-[#E2DDD2]">
        <span class="text-eyebrow text-[#8A7029]">
          {{ 'CHECKOUT.EYEBROW' | translate }}
        </span>
        <h1 class="font-display text-page-title font-bold text-[#1A1A1D] mt-1">
          {{ 'CHECKOUT.TITLE' | translate }}
        </h1>
      </div>

      @if (cartLines().length === 0) {
        <div class="text-center py-16 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl">
          <h3 class="font-display text-xl font-medium text-[#1A1A1D] mb-2">
            {{ 'CHECKOUT.CART.EMPTY' | translate }}
          </h3>
          <p class="text-xs text-[#5F5D56] mb-6">
            Please add objects to your ritual bag before proceeding to checkout.
          </p>
          <a routerLink="/shop" class="btn-primary">
            {{ 'CHECKOUT.CART.BROWSE' | translate }}
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <!-- Main Checkout Column (7 cols desktop) -->
          <div class="lg:col-span-7 space-y-10">
            <!-- 1. Authenticated User & Contact Step -->
            <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-8 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-[#E2DDD2]">
                <h2 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
                  1. Contact Information
                </h2>
                <span class="text-[11px] text-[#10523C] font-medium">Verified</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
                <div>
                  <span class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-0.5">
                    {{ 'CHECKOUT.CONTACT.FULL_NAME' | translate }}
                  </span>
                  <span class="font-medium text-[#1A1A1D]">{{ currentUser()?.fullName }}</span>
                </div>

                <div>
                  <span class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-0.5">
                    Email Address
                  </span>
                  <span class="font-medium text-[#1A1A1D]">{{ currentUser()?.email }}</span>
                </div>
              </div>
            </div>

            <!-- 2. Shipping Address Selection Step -->
            <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-8 space-y-6">
              <div class="flex items-center justify-between pb-3 border-b border-[#E2DDD2]">
                <h2 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D]">
                  2. Shipping Address
                </h2>

                @if (!showNewAddressForm()) {
                  <button
                    type="button"
                    (click)="showNewAddressForm.set(true)"
                    class="text-xs text-[#8A7029] hover:text-[#10523C] font-semibold transition-colors cursor-pointer"
                  >
                    {{ 'CHECKOUT.ADDRESS.ADD_NEW' | translate }}
                  </button>
                }
              </div>

              <!-- Saved Addresses List -->
              @if (!showNewAddressForm()) {
                @if (addresses().length === 0) {
                  <div class="text-center py-6">
                    <p class="text-xs text-[#5F5D56] mb-4">No shipping addresses saved yet.</p>
                    <button
                      type="button"
                      (click)="showNewAddressForm.set(true)"
                      class="btn-secondary text-xs"
                    >
                      {{ 'CHECKOUT.ADDRESS.ADD_NEW' | translate }}
                    </button>
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (addr of addresses(); track addr.id) {
                      <label
                        class="flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer"
                        [class.border-[#10523C]]="selectedAddressId() === addr.id"
                        [class.bg-[#F4F1EA]/50]="selectedAddressId() === addr.id"
                        [class.border-[#E2DDD2]]="selectedAddressId() !== addr.id"
                      >
                        <input
                          type="radio"
                          name="addressSelection"
                          [value]="addr.id"
                          [ngModel]="selectedAddressId()"
                          (ngModelChange)="selectedAddressId.set($event)"
                          class="mt-1 text-[#10523C] focus:ring-[#10523C]"
                        />

                        <div class="space-y-0.5 text-xs text-[#5F5D56] flex-1">
                          <p class="font-semibold text-sm text-[#1A1A1D]">{{ addr.street }}</p>
                          <p>{{ addr.city }}, {{ addr.zipCode }}</p>
                          <p>{{ addr.country }}</p>
                          @if (addr.additionalInfo) {
                            <p class="text-[#8D8A81] italic">{{ addr.additionalInfo }}</p>
                          }
                          @if (addr.isDefault) {
                            <span class="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-[#8A7029]">
                              Default Address
                            </span>
                          }
                        </div>
                      </label>
                    }
                  </div>
                }
              } @else {
                <!-- New Address Form -->
                <form [formGroup]="addressForm" (ngSubmit)="onSaveNewAddress()" class="space-y-4 pt-2">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                        {{ 'CHECKOUT.ADDRESS.COUNTRY' | translate }} *
                      </label>
                      <input
                        type="text"
                        formControlName="country"
                        class="atelier-input"
                        placeholder="Georgia"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                        {{ 'CHECKOUT.ADDRESS.CITY' | translate }} *
                      </label>
                      <input
                        type="text"
                        formControlName="city"
                        class="atelier-input"
                        placeholder="Tbilisi"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                      {{ 'CHECKOUT.ADDRESS.STREET' | translate }} *
                    </label>
                    <input
                      type="text"
                      formControlName="street"
                      class="atelier-input"
                      placeholder="12 Rustaveli Avenue"
                    />
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                        {{ 'CHECKOUT.ADDRESS.ZIP' | translate }} *
                      </label>
                      <input
                        type="text"
                        formControlName="zipCode"
                        class="atelier-input"
                        placeholder="0108"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                        {{ 'CHECKOUT.ADDRESS.ADDITIONAL' | translate }}
                      </label>
                      <input
                        type="text"
                        formControlName="additionalInfo"
                        class="atelier-input"
                        placeholder="Apartment, floor, entrance"
                      />
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isDefaultCheck"
                      formControlName="isDefault"
                      class="text-[#10523C] focus:ring-[#10523C] rounded"
                    />
                    <label for="isDefaultCheck" class="text-xs text-[#5F5D56] cursor-pointer">
                      Save as default shipping address
                    </label>
                  </div>

                  <div class="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      (click)="showNewAddressForm.set(false)"
                      class="btn-secondary text-xs py-2.5 px-4"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      [disabled]="addressForm.invalid || savingAddress()"
                      class="btn-primary text-xs py-2.5 px-5"
                    >
                      {{ savingAddress() ? 'Saving...' : 'Save & Select Address' }}
                    </button>
                  </div>
                </form>
              }
            </div>

            <!-- 3. Ritual Preparation & Order Fulfillment -->
            <div class="bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-8 space-y-4">
              <h2 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] pb-3 border-b border-[#E2DDD2]">
                3. Fulfillment & Atelier Guarantee
              </h2>

              <p class="text-xs text-[#5F5D56] leading-relaxed">
                Your order is prepared at our physical atelier according to artisanal standards. All items are sealed with protective ritual intention before dispatch. Payment settlement occurs upon order processing.
              </p>
            </div>
          </div>

          <!-- Order Summary & Place Order Column (5 cols desktop) -->
          <div class="lg:col-span-5 bg-[#FCFBF9] border border-[#E2DDD2] rounded-xl p-6 sm:p-8 space-y-6 sticky top-24 shadow-xs">
            <h2 class="text-xs font-semibold uppercase tracking-widest text-[#1A1A1D] pb-4 border-b border-[#E2DDD2]">
              Order Summary ({{ cartTotalCount() }} Items)
            </h2>

            <!-- Items preview -->
            <div class="max-h-60 overflow-y-auto space-y-3 pr-1">
              @for (item of cartLines(); track item.productId) {
                <div class="flex items-center justify-between gap-3 text-xs">
                  <div class="flex items-center gap-3 min-w-0">
                    <img
                      [src]="item.imageUrl | assetUrl"
                      [alt]="item.name"
                      class="w-12 h-15 object-cover rounded bg-[#F4F1EA] border border-[#E2DDD2] shrink-0"
                    />
                    <div class="min-w-0">
                      <p class="font-semibold text-[#1A1A1D] line-clamp-1 font-body product-title">
                        {{ item.name }}
                      </p>
                      <p class="text-[#8D8A81]">Qty: {{ item.quantity }} × {{ item.price | price }}</p>
                    </div>
                  </div>
                  <span class="font-semibold text-[#1A1A1D] shrink-0">
                    {{ item.price * item.quantity | price }}
                  </span>
                </div>
              }
            </div>

            <div class="gold-rule"></div>

            <!-- Price Breakdown -->
            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between text-[#5F5D56]">
                <span>{{ 'CHECKOUT.SUMMARY.SUBTOTAL' | translate }}</span>
                <span class="text-sm font-semibold text-[#1A1A1D]">{{ subtotal() | price }}</span>
              </div>

              <div class="flex items-center justify-between text-[#5F5D56]">
                <span>Shipping</span>
                <span class="text-xs text-[#10523C] font-medium">Standard Delivery</span>
              </div>

              <div class="flex items-center justify-between pt-3 border-t border-[#E2DDD2] text-sm">
                <span class="font-semibold text-[#1A1A1D]">Total Amount</span>
                <span class="font-bold text-lg text-[#10523C]">{{ subtotal() | price }}</span>
              </div>
            </div>

            <!-- Place Order Button -->
            <button
              type="button"
              (click)="onPlaceOrder()"
              [disabled]="!selectedAddressId() || placingOrder()"
              class="btn-primary w-full text-center text-xs py-4 flex items-center justify-center gap-2"
            >
              @if (placingOrder()) {
                <span>Placing Ritual Order...</span>
              } @else {
                <span>{{ 'CHECKOUT.ACTIONS.PLACE_ORDER' | translate }}</span>
                <app-icon name="arrow-right" [size]="16" />
              }
            </button>

            @if (!selectedAddressId() && !showNewAddressForm()) {
              <p class="text-[11px] text-[#8A7029] text-center">
                Please select or add a shipping address to place your order.
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);
  private readonly notification = inject(NotificationService);

  public readonly cartLines = this.store.selectSignal(CartSelectors.lines);
  public readonly cartTotalCount = this.store.selectSignal(CartSelectors.totalCount);
  public readonly subtotal = this.store.selectSignal(CartSelectors.subtotal);
  public readonly currentUser = this.store.selectSignal(AuthSelectors.user);
  public readonly addresses = this.store.selectSignal(ProfileSelectors.addresses);
  public readonly placingOrder = this.store.selectSignal(OrdersSelectors.placingOrder);

  public readonly selectedAddressId = signal<string | null>(null);
  public readonly showNewAddressForm = signal(false);
  public readonly savingAddress = signal(false);

  public readonly addressForm = this.fb.group({
    country: ['Georgia', Validators.required],
    city: ['', Validators.required],
    street: ['', Validators.required],
    zipCode: ['', Validators.required],
    additionalInfo: [''],
    isDefault: [true],
  });

  ngOnInit(): void {
    this.store.dispatch(new LoadProfile()).subscribe(() => {
      const list = this.addresses();
      if (list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        this.selectedAddressId.set(defaultAddr.id);
      }
    });
  }

  public onSaveNewAddress(): void {
    if (this.addressForm.invalid) return;
    this.savingAddress.set(true);

    const val = this.addressForm.value;
    this.store
      .dispatch(
        new AddAddress({
          country: val.country!,
          city: val.city!,
          street: val.street!,
          zipCode: val.zipCode!,
          additionalInfo: val.additionalInfo || null,
          isDefault: !!val.isDefault,
        }),
      )
      .subscribe({
        next: () => {
          this.savingAddress.set(false);
          this.showNewAddressForm.set(false);
          const list = this.addresses();
          if (list.length > 0) {
            this.selectedAddressId.set(list[list.length - 1].id);
          }
        },
        error: () => {
          this.savingAddress.set(false);
        },
      });
  }

  public onPlaceOrder(): void {
    const addressId = this.selectedAddressId();
    if (!addressId) {
      this.notification.warning('Please select a shipping address');
      return;
    }

    this.store.dispatch(new CheckoutOrder(addressId));
  }
}
