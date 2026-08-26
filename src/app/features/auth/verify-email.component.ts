import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngxs/store';
import { TranslateModule } from '@ngx-translate/core';

import { ResendVerification, VerifyEmail } from '@store/auth/auth.actions';
import { AuthSelectors } from '@store/auth/auth.selectors';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="atelier-container pt-12 pb-24">
      <div class="max-w-md mx-auto bg-[#FCFBF9] border border-[#E2DDD2] rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
        <!-- Header -->
        <div class="text-center space-y-2">
          <span class="text-eyebrow text-[#8A7029]">
            Consecration of Identity
          </span>
          <h1 class="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1D]">
            {{ 'AUTH.VERIFY_EMAIL' | translate }}
          </h1>
          <p class="text-xs text-[#5F5D56] leading-relaxed">
            {{ 'AUTH.VERIFY_EMAIL_DESC' | translate }}
          </p>
          @if (pendingEmail()) {
            <p class="text-xs font-semibold text-[#10523C] bg-[#F4F1EA] py-1.5 px-3 rounded-md inline-block">
              {{ pendingEmail() }}
            </p>
          }
        </div>

        <!-- Form -->
        <form [formGroup]="verifyForm" (ngSubmit)="onSubmit()" class="space-y-4 pt-2">
          @if (!pendingEmail()) {
            <div>
              <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
                {{ 'FORM.LABELS.EMAIL' | translate }}
              </label>
              <input
                type="email"
                formControlName="email"
                class="atelier-input"
                placeholder="you@example.com"
              />
            </div>
          }

          <!-- Verification Code -->
          <div>
            <label class="block text-[11px] uppercase tracking-wider text-[#8D8A81] mb-1 font-medium">
              6-Digit Code
            </label>
            <input
              type="text"
              formControlName="code"
              maxlength="6"
              placeholder="123456"
              class="atelier-input text-center text-lg tracking-[0.3em] font-mono"
            />
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="verifyForm.invalid || loading()"
            class="btn-primary w-full text-center text-xs py-3.5 mt-2"
          >
            {{ loading() ? 'Verifying...' : 'Activate Account' }}
          </button>
        </form>

        <!-- Resend Code section -->
        <div class="text-center pt-2 border-t border-[#E2DDD2] space-y-2">
          <p class="text-xs text-[#5F5D56]">
            {{ 'AUTH.DIDNT_RECEIVE_CODE' | translate }}
          </p>
          <button
            type="button"
            (click)="onResend()"
            [disabled]="resendCountdown() > 0"
            class="text-xs font-semibold text-[#10523C] hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            @if (resendCountdown() > 0) {
              {{ 'AUTH.RESEND_CODE_COUNTDOWN' | translate : { seconds: resendCountdown() } }}
            } @else {
              {{ 'AUTH.RESEND_CODE' | translate }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  public readonly pendingEmail = this.store.selectSignal(
    AuthSelectors.pendingVerificationEmail,
  );
  public readonly loading = this.store.selectSignal(AuthSelectors.loading);

  public readonly resendCountdown = signal(0);

  public readonly verifyForm = this.fb.group({
    email: [''],
    code: ['', [Validators.required, Validators.minLength(4)]],
  });

  ngOnInit(): void {
    if (this.pendingEmail()) {
      this.verifyForm.patchValue({ email: this.pendingEmail() });
    }
  }

  public onSubmit(): void {
    if (this.verifyForm.invalid) return;
    const email = this.pendingEmail() || this.verifyForm.value.email || '';
    const code = this.verifyForm.value.code || '';

    this.store.dispatch(new VerifyEmail({ email, code }));
  }

  public onResend(): void {
    const email = this.pendingEmail() || this.verifyForm.value.email || '';
    if (!email) return;

    this.store.dispatch(new ResendVerification(email));
    this.resendCountdown.set(60);

    const interval = setInterval(() => {
      this.resendCountdown.update((val) => {
        if (val <= 1) {
          clearInterval(interval);
          return 0;
        }
        return val - 1;
      });
    }, 1000);
  }
}
