import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { Login, GoogleLogin } from '@store/auth/auth.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, TranslateModule, IconComponent],
  template: `
    <div class="atelier-container pt-12 pb-24">
      <div class="max-w-md mx-auto bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            WitchLab Initiation
          </span>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
            {{ 'AUTH.LOG_IN' | translate }}
          </h1>
          <p class="text-xs text-[#5F5D56] leading-relaxed">
            {{ 'AUTH.LOG_IN_DESC' | translate }}
          </p>
        </div>

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
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
            <div class="flex items-center justify-between mb-1">
              <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] font-medium">
                {{ 'FORM.LABELS.PASSWORD' | translate }}
              </label>
              <a
                routerLink="/forgot-password"
                class="text-[11px] text-[#8A7029] hover:underline"
              >
                {{ 'AUTH.FORGOT_PASSWORD' | translate }}
              </a>
            </div>

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
                {{ 'ERRORS.REQUIRED' | translate }}
              </p>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="loginForm.invalid || loading()"
            class="btn-primary w-full text-center text-xs py-3.5 mt-4"
          >
            {{ loading() ? 'Authenticating...' : ('AUTH.LOG_IN_BTN' | translate) }}
          </button>
        </form>

        <!-- Divider -->
        <div class="relative flex items-center justify-center pt-2">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-[#E2DDD2]"></div>
          </div>
          <span class="relative bg-[#FCFBF9] px-3 text-[11px] uppercase tracking-wider text-[#8D8A81]">
            {{ 'AUTH.OR' | translate }}
          </span>
        </div>

        <!-- Switch to Register -->
        <div class="text-center pt-2">
          <p class="text-xs text-[#5F5D56]">
            {{ 'AUTH.DONT_HAVE_ACCOUNT' | translate }}
            <a routerLink="/register" class="font-semibold text-[#10523C] hover:underline ml-1">
              {{ 'AUTH.SIGN_UP' | translate }}
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly loading = this.store.selectSignal(AuthSelectors.loading);
  public readonly showPassword = signal(false);

  public readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  public isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;
    this.store.dispatch(new Login({ email: email!, password: password! }));
  }
}
