import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { Register } from '@store/auth/auth.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-12 pb-24">
      <div class="max-w-md mx-auto bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Initiation into the Circle
          </span>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
            {{ 'AUTH.SIGN_UP' | translate }}
          </h1>
          <p class="text-xs text-[#5F5D56] leading-relaxed">
            Create an account to track orders and access atelier collections.
          </p>
        </div>

        <!-- Form -->
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
          <!-- Full Name -->
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.FULL_NAME' | translate }}
            </label>
            <input
              type="text"
              formControlName="fullName"
              [placeholder]="'FORM.PLACEHOLDERS.FULL_NAME' | translate"
              class="atelier-input"
              [class.error]="isFieldInvalid('fullName')"
            />
            @if (isFieldInvalid('fullName')) {
              <p class="text-[11px] text-red-700 mt-1">
                {{ 'ERRORS.REQUIRED' | translate }}
              </p>
            }
          </div>

          <!-- Email -->
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.EMAIL' | translate }}
            </label>
            <input
              type="email"
              formControlName="email"
              [placeholder]="'FORM.PLACEHOLDERS.EMAIL' | translate"
              class="atelier-input"
              [class.error]="isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <p class="text-[11px] text-red-700 mt-1">
                {{ 'ERRORS.EMAIL' | translate }}
              </p>
            }
          </div>

          <!-- Password -->
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.PASSWORD' | translate }}
            </label>
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                [placeholder]="'FORM.PLACEHOLDERS.PASSWORD' | translate"
                class="atelier-input pr-10"
                [class.error]="isFieldInvalid('password')"
              />
              <button
                type="button"
                (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#8D8A81] hover:text-[#1A1A1D] p-1 cursor-pointer"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" />
              </button>
            </div>
            @if (isFieldInvalid('password')) {
              <p class="text-[11px] text-red-700 mt-1">
                Password must be at least 8 characters with numbers and letters.
              </p>
            }
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              {{ 'FORM.LABELS.CONFIRM_PASSWORD' | translate }}
            </label>
            <input
              type="password"
              formControlName="confirmPassword"
              [placeholder]="'FORM.PLACEHOLDERS.CONFIRM_PASSWORD' | translate"
              class="atelier-input"
              [class.error]="isFieldInvalid('confirmPassword')"
            />
            @if (registerForm.errors?.['mismatch'] && registerForm.get('confirmPassword')?.touched) {
              <p class="text-[11px] text-red-700 mt-1">
                {{ 'ERRORS.PASSWORD_MISMATCH' | translate }}
              </p>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="registerForm.invalid || loading()"
            class="btn-primary w-full text-center text-xs py-3.5 mt-4"
          >
            {{ loading() ? 'Creating Account...' : ('AUTH.SIGN_UP' | translate) }}
          </button>
        </form>

        <!-- Switch to Login -->
        <div class="text-center pt-2 border-t border-[#E2DDD2]">
          <p class="text-xs text-[#5F5D56]">
            Already have an account?
            <a routerLink="/login" class="font-semibold text-[#10523C] hover:underline ml-1">
              {{ 'AUTH.LOG_IN_BTN' | translate }}
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly loading = this.store.selectSignal(AuthSelectors.loading);
  public readonly showPassword = signal(false);

  public readonly registerForm = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(form: any) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  public onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, password, confirmPassword } = this.registerForm.value;
    this.store.dispatch(
      new Register({
        fullName: fullName!,
        email: email!,
        password: password!,
        confirmPassword: confirmPassword!,
      }),
    );
  }
}
