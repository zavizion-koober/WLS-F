import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ChangePassword, DeleteAccount } from '@store/profile/profile.actions';

@Component({
  selector: 'app-account-security',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="space-y-12 max-w-lg">
      <!-- Change Password Section -->
      <div class="space-y-6">
        <div class="pb-4 border-b border-[#E2DDD2]">
          <h2 class="font-display text-xl sm:text-2xl font-bold text-[#1A1A1D]">
            {{ 'PROFILE.SECURITY.TITLE' | translate }}
          </h2>
          <p class="text-xs text-[#5F5D56] mt-0.5">
            Update your secret authentication phrase.
          </p>
        </div>

        <form [formGroup]="passwordForm" (ngSubmit)="onChangePassword()" class="space-y-4">
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'PROFILE.SECURITY.CURRENT_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="currentPassword"
              class="atelier-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'PROFILE.SECURITY.NEW_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="newPassword"
              class="atelier-input"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.CONFIRM_PASSWORD' | translate }} *
            </label>
            <input
              type="password"
              formControlName="confirmPassword"
              class="atelier-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            [disabled]="passwordForm.invalid || changingPassword()"
            class="btn-primary text-xs py-3 px-6 mt-2"
          >
            {{ changingPassword() ? 'Updating...' : ('PROFILE.SECURITY.UPDATE_PASSWORD' | translate) }}
          </button>
        </form>
      </div>

      <!-- Danger Zone: Delete Account -->
      <div class="space-y-4 p-6 rounded-xl border border-red-200 bg-red-50/50">
        <h3 class="text-sm font-semibold uppercase tracking-wider text-red-900">
          {{ 'PROFILE.SECURITY.DANGER_ZONE' | translate }}
        </h3>
        <p class="text-xs text-red-800/80 leading-relaxed">
          {{ 'PROFILE.SECURITY.DELETE_WARNING' | translate }}
        </p>

        @if (!confirmingDelete()) {
          <button
            type="button"
            (click)="confirmingDelete.set(true)"
            class="btn-secondary text-xs py-2 px-4 text-red-700 border-red-700/50 hover:bg-red-100/50 cursor-pointer"
          >
            {{ 'PROFILE.SECURITY.DELETE_ACCOUNT' | translate }}
          </button>
        } @else {
          <div class="space-y-3 pt-2">
            <p class="text-xs font-semibold text-red-900">
              Are you absolute certain? This action is permanent and cannot be undone.
            </p>
            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="onDeleteAccount()"
                class="bg-red-800 hover:bg-red-900 text-[#FCFBF9] text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
              >
                Yes, Delete My Account
              </button>
              <button
                type="button"
                (click)="confirmingDelete.set(false)"
                class="text-xs text-[#5F5D56] hover:text-[#1A1A1D] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AccountSecurityComponent {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  public readonly changingPassword = signal(false);
  public readonly confirmingDelete = signal(false);

  public readonly passwordForm = this.fb.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(form: any) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  public onChangePassword(): void {
    if (this.passwordForm.invalid) return;
    this.changingPassword.set(true);

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
    this.store
      .dispatch(
        new ChangePassword({
          currentPassword: currentPassword!,
          newPassword: newPassword!,
          confirmPassword: confirmPassword!,
        }),
      )
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.passwordForm.reset();
        },
        error: () => this.changingPassword.set(false),
      });
  }

  public onDeleteAccount(): void {
    this.store.dispatch(new DeleteAccount());
  }
}
