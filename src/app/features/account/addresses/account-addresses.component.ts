import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileSelectors } from '@store/profile/profile.selectors';
import {
  AddAddress,
  DeleteAddress,
  EditAddress,
  LoadProfile,
} from '@store/profile/profile.actions';
import { UserAddress } from '@store/profile/profile.models';
import { IconComponent } from '@shared/components/icon/icon.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, IconComponent, EmptyStateComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-[#E2DDD2]">
        <div>
          <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D]">
            {{ 'PROFILE.ADDRESSES.TITLE' | translate }}
          </h2>
          <p class="text-xs text-[#5F5D56] mt-0.5">
            Manage your physical delivery destinations for atelier orders.
          </p>
        </div>

        @if (!showForm()) {
          <button
            type="button"
            (click)="openAddForm()"
            class="btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            {{ 'PROFILE.ADDRESSES.ADD_NEW' | translate }}
          </button>
        }
      </div>

      <!-- Add / Edit Address Form Modal / Inline Box -->
      @if (showForm()) {
        <div class="p-6 bg-[#F4F1EA]/60 border border-[#E2DDD2] rounded-xl space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#E2DDD2]">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-[#1A1A1D]">
              {{ editingAddressId() ? ('PROFILE.ADDRESSES.EDIT_TITLE' | translate) : ('PROFILE.ADDRESSES.ADD_TITLE' | translate) }}
            </h3>
            <button
              type="button"
              (click)="cancelForm()"
              class="text-[#8D8A81] hover:text-[#1A1A1D] p-1 cursor-pointer"
            >
              <app-icon name="close" [size]="16" />
            </button>
          </div>

          <form [formGroup]="addressForm" (ngSubmit)="onSaveAddress()" class="space-y-4 pt-2">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                  Country *
                </label>
                <input type="text" formControlName="country" class="atelier-input" placeholder="Georgia" />
              </div>

              <div>
                <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                  City *
                </label>
                <input type="text" formControlName="city" class="atelier-input" placeholder="Tbilisi" />
              </div>
            </div>

            <div>
              <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                Street Address *
              </label>
              <input type="text" formControlName="street" class="atelier-input" placeholder="12 Rustaveli Ave" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                  Zip Code *
                </label>
                <input type="text" formControlName="zipCode" class="atelier-input" placeholder="0108" />
              </div>

              <div>
                <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                  Additional Info
                </label>
                <input type="text" formControlName="additionalInfo" class="atelier-input" placeholder="Apartment, Floor, etc." />
              </div>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="addrDefault" formControlName="isDefault" class="text-[#10523C] rounded" />
              <label for="addrDefault" class="text-xs text-[#5F5D56] cursor-pointer">
                Set as default shipping address
              </label>
            </div>

            <div class="flex items-center gap-3 pt-3">
              <button type="button" (click)="cancelForm()" class="btn-secondary text-xs py-2.5 px-4">
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="addressForm.invalid || saving()"
                class="btn-primary text-xs py-2.5 px-5"
              >
                {{ saving() ? 'Saving...' : 'Save Address' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Addresses List -->
      @if (addresses().length === 0 && !showForm()) {
        <app-empty-state
          icon="shield"
          [title]="'PROFILE.ADDRESSES.EMPTY' | translate"
          description="You do not have any saved shipping addresses. Add an address to speed up ritual orders."
          [actionLabel]="'PROFILE.ADDRESSES.ADD_NEW' | translate"
          [actionClick]="openAddFormBound"
        />
      } @else if (!showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (addr of addresses(); track addr.id) {
            <div class="p-5 rounded-xl border border-[#E2DDD2] bg-[#F4F1EA]/40 space-y-3 relative">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-sm text-[#1A1A1D]">{{ addr.street }}</h4>
                  <p class="text-xs text-[#5F5D56]">{{ addr.city }}, {{ addr.zipCode }}</p>
                  <p class="text-xs text-[#5F5D56]">{{ addr.country }}</p>
                  @if (addr.additionalInfo) {
                    <p class="text-xs text-[#8D8A81] italic mt-1">{{ addr.additionalInfo }}</p>
                  }
                </div>

                @if (addr.isDefault) {
                  <span class="bg-[#10523C]/10 text-[#10523C] border border-[#10523C]/30 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded">
                    Default
                  </span>
                }
              </div>

              <!-- Address Actions -->
              <div class="pt-3 border-t border-[#E2DDD2]/60 flex items-center justify-between text-xs">
                <button
                  type="button"
                  (click)="openEditForm(addr)"
                  class="text-[#8A7029] hover:underline font-medium cursor-pointer"
                >
                  {{ 'PROFILE.ACTIONS.EDIT' | translate }}
                </button>

                <button
                  type="button"
                  (click)="onDeleteAddress(addr.id)"
                  class="text-[#8D8A81] hover:text-red-700 transition-colors cursor-pointer"
                >
                  {{ 'PROFILE.ACTIONS.DELETE' | translate }}
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AccountAddressesComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  public readonly addresses = this.store.selectSignal(ProfileSelectors.addresses);
  public readonly showForm = signal(false);
  public readonly editingAddressId = signal<string | null>(null);
  public readonly saving = signal(false);

  public readonly openAddFormBound = () => this.openAddForm();

  public readonly addressForm = this.fb.group({
    country: ['Georgia', Validators.required],
    city: ['', Validators.required],
    street: ['', Validators.required],
    zipCode: ['', Validators.required],
    additionalInfo: [''],
    isDefault: [false],
  });

  ngOnInit(): void {
    this.store.dispatch(new LoadProfile());
  }

  public openAddForm(): void {
    this.editingAddressId.set(null);
    this.addressForm.reset({ country: 'Georgia', isDefault: false });
    this.showForm.set(true);
  }

  public openEditForm(addr: UserAddress): void {
    this.editingAddressId.set(addr.id);
    this.addressForm.patchValue({
      country: addr.country,
      city: addr.city,
      street: addr.street,
      zipCode: addr.zipCode,
      additionalInfo: addr.additionalInfo || '',
      isDefault: addr.isDefault,
    });
    this.showForm.set(true);
  }

  public cancelForm(): void {
    this.showForm.set(false);
    this.editingAddressId.set(null);
  }

  public onSaveAddress(): void {
    if (this.addressForm.invalid) return;
    this.saving.set(true);

    const val = this.addressForm.value;
    const editingId = this.editingAddressId();

    if (editingId) {
      this.store
        .dispatch(
          new EditAddress({
            id: editingId,
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
            this.saving.set(false);
            this.showForm.set(false);
          },
          error: () => this.saving.set(false),
        });
    } else {
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
            this.saving.set(false);
            this.showForm.set(false);
          },
          error: () => this.saving.set(false),
        });
    }
  }

  public onDeleteAddress(id: string): void {
    if (confirm('Are you sure you want to remove this address?')) {
      this.store.dispatch(new DeleteAddress(id));
    }
  }
}
