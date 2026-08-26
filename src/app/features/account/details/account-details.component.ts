import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ProfileSelectors } from '@store/profile/profile.selectors';
import { LoadProfile, UpdateProfile } from '@store/profile/profile.actions';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="space-y-6 max-w-lg">
      <div class="pb-4 border-b border-[#E2DDD2]">
        <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D]">
          {{ 'PROFILE.DETAILS.TITLE' | translate }}
        </h2>
        <p class="text-xs text-[#5F5D56] mt-0.5">
          Update your initiate name and contact phone number.
        </p>
      </div>

      <form [formGroup]="detailsForm" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
        <div>
          <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
            {{ 'FORM.LABELS.FULL_NAME' | translate }} *
          </label>
          <input
            type="text"
            formControlName="fullName"
            class="atelier-input"
            placeholder="Your Full Name"
          />
        </div>

        <div>
          <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
            Phone Number
          </label>
          <input
            type="tel"
            formControlName="phoneNumber"
            class="atelier-input"
            placeholder="+995 555 123 456"
          />
        </div>

        <button
          type="submit"
          [disabled]="detailsForm.invalid || saving()"
          class="btn-primary text-xs py-3 px-6 mt-2"
        >
          {{ saving() ? 'Updating...' : ('PROFILE.ACTIONS.SAVE' | translate) }}
        </button>
      </form>
    </div>
  `,
})
export class AccountDetailsComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  public readonly profile = this.store.selectSignal(ProfileSelectors.profile);
  public readonly saving = signal(false);

  public readonly detailsForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phoneNumber: [''],
  });

  ngOnInit(): void {
    this.store.dispatch(new LoadProfile()).subscribe(() => {
      const p = this.profile();
      if (p) {
        this.detailsForm.patchValue({
          fullName: p.fullName,
          phoneNumber: p.details?.phoneNumber || '',
        });
      }
    });
  }

  public onSubmit(): void {
    if (this.detailsForm.invalid) return;
    this.saving.set(true);

    const { fullName, phoneNumber } = this.detailsForm.value;
    this.store
      .dispatch(
        new UpdateProfile({
          fullName: fullName!,
          phoneNumber: phoneNumber || null,
        }),
      )
      .subscribe({
        next: () => this.saving.set(false),
        error: () => this.saving.set(false),
      });
  }
}
